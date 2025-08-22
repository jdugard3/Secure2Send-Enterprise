import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, hashPassword } from "./auth";
import { insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadLimiter, adminLimiter } from "./middleware/rateLimiting";
import { secureUpload, FileValidator } from "./middleware/fileValidation";
import { EmailService } from "./services/emailService";
import { env } from "./env";
import { cloudflareR2 } from "./services/cloudflareR2";
import { AuditService } from "./services/auditService";

// File upload configuration is now handled in fileValidation middleware

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes are now handled in auth.ts

  // Health check endpoint for monitoring
  app.get('/api/health', async (req, res) => {
    try {
      // Test database connectivity
      const testUser = await storage.getUser('test-non-existent-id');
      
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: 'connected'
      });
    } catch (error) {
      console.error('Health check database error:', error);
      res.status(500).json({ 
        status: 'error', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown database error'
      });
    }
  });

  // Document routes
  app.post('/api/documents', uploadLimiter, requireAuth, secureUpload.single('file'), async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'CLIENT') {
        return res.status(403).json({ message: "Access denied" });
      }

      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(404).json({ message: "Client profile not found" });
      }

      const file = req.file;
      const { documentType } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Enhanced file validation
      const validationResult = await FileValidator.validateFile(file, documentType);
      if (!validationResult.valid) {
        // Clean up uploaded file if validation fails
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(400).json({ message: validationResult.error });
      }

      let r2Key: string | undefined;
      let r2Url: string | undefined;

      // Upload to Cloudflare R2 if configured
      if (cloudflareR2) {
        try {
          const r2Result = await cloudflareR2.uploadFile(file.path, file.originalname, client.id);
          r2Key = r2Result.key;
          r2Url = r2Result.url;
        } catch (error) {
          console.error('Failed to upload to Cloudflare R2:', error);
          // Continue with local storage as fallback
        }
      }

      const documentData = {
        filename: file.filename,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath: file.path,
        documentType,
        clientId: client.id,
        status: 'PENDING' as const,
        r2Key,
        r2Url,
      };

      const document = await storage.createDocument(documentData);

      // Audit log the upload
      await AuditService.logDocumentUpload(user, req, document.id, documentType, file.originalname);

      // Clean up local file after R2 upload (if successful)
      if (r2Key && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Failed to clean up local file:', error);
        }
      }

      // Send document uploaded confirmation email to user (async, don't block response)
      EmailService.sendDocumentUploadedEmail(user, document).catch(error => {
        console.error('Failed to send document uploaded email:', error);
      });

      // Send new document notification to admins (async, don't block response)
      EmailService.sendNewDocumentNotificationEmail(user, document).catch(error => {
        console.error('Failed to send new document notification email:', error);
      });

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get('/api/documents', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      let targetUserId = user.id;
      
      // If admin is impersonating, use the impersonated user's data
      if (user.role === 'ADMIN' && req.session.isImpersonating && req.session.impersonatedUserId) {
        targetUserId = req.session.impersonatedUserId;
        console.log('Admin impersonating, fetching documents for user:', targetUserId);
      } else {
        console.log('Fetching documents for user:', targetUserId);
      }
      
      const targetUser = await storage.getUser(targetUserId);
      
      if (!targetUser) {
        console.log('Target user not found:', targetUserId);
        return res.status(404).json({ message: "User not found" });
      }

      console.log('Target user found:', { id: targetUser.id, role: targetUser.role });

      // If the original user is admin and NOT impersonating, show all documents for review
      if (user.role === 'ADMIN' && !req.session.isImpersonating) {
        const documents = await storage.getAllDocumentsForReview();
        console.log('Admin fetched all documents:', documents.length);
        res.json(documents);
      } else {
        // Show specific client's documents (either real client or impersonated client)
        const client = await storage.getClientByUserId(targetUserId);
        if (!client) {
          console.log('Client profile not found for user:', targetUserId);
          return res.status(404).json({ message: "Client profile not found" });
        }
        console.log('Client found:', client.id);
        
        const documents = await storage.getDocumentsByClientId(client.id);
        console.log('Client documents fetched:', {
          clientId: client.id,
          documentCount: documents.length,
          documents: documents.map(d => ({ id: d.id, type: d.documentType, status: d.status }))
        });
        res.json(documents);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ 
        message: "Failed to fetch documents",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/documents/:id/download', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check access permissions
      if (user.role === 'CLIENT') {
        const client = await storage.getClientByUserId(userId);
        if (!client || document.clientId !== client.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Audit log the download
      await AuditService.logDocumentDownload(user, req, document.id, document.originalName);

      // Use R2 signed URL if available, fallback to local file
      if (document.r2Key && cloudflareR2) {
        try {
          const downloadUrl = await cloudflareR2.getDownloadUrl(document.r2Key);
          return res.redirect(downloadUrl);
        } catch (error) {
          console.error('Failed to generate R2 signed URL:', error);
          // Fall through to local file handling
        }
      }

      // Fallback to local file system
      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Type', document.mimeType);
      res.sendFile(path.resolve(document.filePath));
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  app.put('/api/documents/:id/status', adminLimiter, requireAdmin, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      if (status === 'REJECTED' && !rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      // Get the document and its owner before updating
      const existingDocument = await storage.getDocumentById(id);
      if (!existingDocument) {
        return res.status(404).json({ message: "Document not found" });
      }

      const client = await storage.getClientById(existingDocument.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const documentOwner = await storage.getUser(client.userId);
      if (!documentOwner) {
        return res.status(404).json({ message: "Document owner not found" });
      }

      const document = await storage.updateDocumentStatus(id, status, rejectionReason);

      // Audit log the status change
      await AuditService.logDocumentStatusChange(
        user, 
        req, 
        id, 
        existingDocument.status || 'UNKNOWN', 
        status, 
        rejectionReason === null ? undefined : rejectionReason
      );

      // Send appropriate email notification based on status
      if (status === 'APPROVED') {
        EmailService.sendDocumentApprovedEmail(documentOwner, document).catch(error => {
          console.error('Failed to send document approved email:', error);
        });

        // Check if all documents are approved for celebration email
        const allDocuments = await storage.getDocumentsByClientId(client.id);
        const allApproved = allDocuments.every(doc => doc.status === 'APPROVED');
        if (allApproved) {
          EmailService.sendAllDocumentsApprovedEmail(documentOwner).catch(error => {
            console.error('Failed to send all documents approved email:', error);
          });
        }
      } else if (status === 'REJECTED' && rejectionReason) {
        EmailService.sendDocumentRejectedEmail(documentOwner, document, rejectionReason).catch(error => {
          console.error('Failed to send document rejected email:', error);
        });
      }

      res.json(document);
    } catch (error) {
      console.error("Error updating document status:", error);
      res.status(500).json({ message: "Failed to update document status" });
    }
  });

  app.delete('/api/documents/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check access permissions
      if (user.role === 'CLIENT') {
        const client = await storage.getClientByUserId(userId);
        if (!client || document.clientId !== client.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Audit log the deletion
      await AuditService.logDocumentDelete(user, req, document.id, document.originalName);

      // Delete from R2 if exists
      if (document.r2Key && cloudflareR2) {
        try {
          await cloudflareR2.deleteFile(document.r2Key);
        } catch (error) {
          console.error('Failed to delete from R2:', error);
        }
      }

      // Delete local file from filesystem
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }

      await storage.deleteDocument(id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Client routes
  app.get('/api/clients', requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.put('/api/clients/:id/status', requireAdmin, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'INCOMPLETE'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Get existing client for audit log
      const existingClient = await storage.getClientById(id);
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      const client = await storage.updateClientStatus(id, status);

      // Audit log the status change
      await AuditService.logClientStatusUpdate(user, req, id, existingClient.status || 'UNKNOWN', status);

      res.json(client);
    } catch (error) {
      console.error("Error updating client status:", error);
      res.status(500).json({ message: "Failed to update client status" });
    }
  });

  // Admin user management routes
  app.get('/api/admin/users', requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin impersonation routes
  app.post('/api/admin/impersonate', requireAdmin, async (req: any, res: Response) => {
    try {
      const { userId } = req.body;
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);

      if (!admin || admin.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.role !== 'CLIENT') {
        return res.status(400).json({ message: "Can only impersonate client users" });
      }

      // Audit log impersonation start
      await AuditService.logImpersonationStart(admin, req, userId, targetUser.email);

      // Store impersonation data in session (keep admin logged in)
      req.session.isImpersonating = true;
      req.session.impersonatedUserId = userId;

      // Return the admin user with impersonation context
      const adminWithImpersonation = {
        ...admin,
        isImpersonating: true,
        impersonatedUser: targetUser
      };

      res.json(adminWithImpersonation);
    } catch (error) {
      console.error("Error impersonating user:", error);
      res.status(500).json({ message: "Failed to impersonate user" });
    }
  });

  app.post('/api/admin/stop-impersonate', requireAuth, async (req: any, res: Response) => {
    try {
      if (!req.session.isImpersonating || !req.session.impersonatedUserId) {
        return res.status(400).json({ message: "Not currently impersonating" });
      }

      const admin = req.user; // Admin is still the logged-in user
      if (!admin || admin.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const impersonatedUserId = req.session.impersonatedUserId;
      const impersonatedUser = await storage.getUser(impersonatedUserId);

      if (impersonatedUser) {
        // Audit log impersonation end
        await AuditService.logImpersonationEnd(admin, req, impersonatedUser.id, impersonatedUser.email);
      }

      // Clear impersonation session data
      req.session.impersonatedUserId = undefined;
      req.session.isImpersonating = false;

      // Return the admin user without impersonation context
      res.json(admin);
    } catch (error) {
      console.error("Error stopping impersonation:", error);
      res.status(500).json({ message: "Failed to stop impersonation" });
    }
  });

  // Stats endpoint for admin dashboard
  app.get('/api/admin/stats', requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const clients = await storage.getAllClients();
      const documents = await storage.getAllDocumentsForReview();
      
      const stats = {
        totalClients: clients.length,
        pendingReview: documents.filter(d => d.status === 'PENDING').length,
        approvedToday: documents.filter(d => 
          d.status === 'APPROVED' && 
          d.reviewedAt && 
          new Date(d.reviewedAt).toDateString() === new Date().toDateString()
        ).length,
        rejectedToday: documents.filter(d => 
          d.status === 'REJECTED' && 
          d.reviewedAt && 
          new Date(d.reviewedAt).toDateString() === new Date().toDateString()
        ).length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Admin create client endpoint
  app.post('/api/admin/create-client', requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, password, firstName, lastName, companyName } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !companyName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        companyName,
        role: "CLIENT",
      });

      // Create client record
      const client = await storage.createClient({
        userId: newUser.id,
        status: "PENDING",
      });

      // Send account created email to user (async, don't block response)
      EmailService.sendAccountCreatedEmail(newUser, password).catch(error => {
        console.error('Failed to send account created email:', error);
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        user: userWithoutPassword,
        client: client
      });
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Admin overview endpoint - comprehensive company/user/document data
  app.get('/api/admin/overview', requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const clients = await storage.getAllClients();
      const allDocuments = await storage.getAllDocumentsForReview();
      
      // Group documents by client
      const documentsByClient = allDocuments.reduce((acc, doc) => {
        const clientId = doc.clientId;
        if (!acc[clientId]) {
          acc[clientId] = [];
        }
        acc[clientId].push(doc);
        return acc;
      }, {} as Record<string, any[]>);

      // Build comprehensive overview data
      const overview = clients.map(client => {
        const clientDocs = documentsByClient[client.id] || [];
        const pendingDocs = clientDocs.filter(d => d.status === 'PENDING');
        const approvedDocs = clientDocs.filter(d => d.status === 'APPROVED');
        const rejectedDocs = clientDocs.filter(d => d.status === 'REJECTED');
        
        return {
          id: client.id,
          companyName: client.user.companyName,
          user: {
            id: client.user.id,
            firstName: client.user.firstName,
            lastName: client.user.lastName,
            email: client.user.email,
            createdAt: client.user.createdAt,
          },
          status: client.status,
          createdAt: client.createdAt,
          documents: {
            total: clientDocs.length,
            pending: pendingDocs.length,
            approved: approvedDocs.length,
            rejected: rejectedDocs.length,
            pendingList: pendingDocs.map(d => ({
              id: d.id,
              documentType: d.documentType,
              filename: d.originalName,
              uploadedAt: d.uploadedAt,
            }))
          }
        };
      });

      res.json(overview);
    } catch (error) {
      console.error("Error fetching admin overview:", error);
      res.status(500).json({ message: "Failed to fetch admin overview" });
    }
  });

  // Email preview routes for development
  if (env.NODE_ENV === 'development') {
    app.get('/api/emails/preview', (req, res) => {
      const emailTypes = [
        'welcome',
        'account-created',
        'document-uploaded',
        'document-approved',
        'document-rejected',
        'all-documents-approved',
        'new-user-notification',
        'new-document-notification'
      ];
      
      const html = `
        <html>
          <head>
            <title>Email Previews - Secure2Send</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .container { max-width: 800px; margin: 0 auto; }
              .email-list { list-style: none; padding: 0; }
              .email-list li { margin: 10px 0; }
              .email-list a { 
                display: block; 
                padding: 15px; 
                background: #f5f5f5; 
                text-decoration: none; 
                border-radius: 5px; 
                color: #333;
              }
              .email-list a:hover { background: #e5e5e5; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🔒 Secure2Send Email Previews</h1>
              <p>Development email template previews:</p>
              <ul class="email-list">
                ${emailTypes.map(type => 
                  `<li><a href="/api/emails/preview/${type}">${type.replace('-', ' ').toUpperCase()}</a></li>`
                ).join('')}
              </ul>
            </div>
          </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    });

    // Individual email preview routes
    app.get('/api/emails/preview/welcome', async (req, res) => {
      try {
        const { render } = await import('@react-email/render');
        const { WelcomeEmail } = await import('./emails/WelcomeEmail');
        
        const html = render(WelcomeEmail({
          firstName: 'John',
          companyName: 'Cannabis Co.',
          appUrl: env.APP_URL!,
        }));
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.status(500).send('Error rendering email: ' + error);
      }
    });

    app.get('/api/emails/preview/account-created', async (req, res) => {
      try {
        const { render } = await import('@react-email/render');
        const { AccountCreatedEmail } = await import('./emails/AccountCreatedEmail');
        
        const html = render(AccountCreatedEmail({
          firstName: 'Jane',
          companyName: 'Green Valley Dispensary',
          email: 'jane@greenvalley.com',
          temporaryPassword: 'temp123456',
          appUrl: env.APP_URL!,
        }));
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.status(500).send('Error rendering email: ' + error);
      }
    });

    app.get('/api/emails/preview/document-uploaded', async (req, res) => {
      try {
        const { render } = await import('@react-email/render');
        const { DocumentUploadedEmail } = await import('./emails/DocumentUploadedEmail');
        
        const html = render(DocumentUploadedEmail({
          firstName: 'Mike',
          documentType: 'CANNABIS_LICENSE',
          documentName: 'cannabis-license.pdf',
          appUrl: env.APP_URL!,
        }));
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.status(500).send('Error rendering email: ' + error);
      }
    });

    app.get('/api/emails/preview/document-approved', async (req, res) => {
      try {
        const { render } = await import('@react-email/render');
        const { DocumentApprovedEmail } = await import('./emails/DocumentApprovedEmail');
        
        const html = render(DocumentApprovedEmail({
          firstName: 'Sarah',
          documentType: 'BANKING_INFO',
          documentName: 'banking-information.pdf',
          appUrl: env.APP_URL!,
        }));
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.status(500).send('Error rendering email: ' + error);
      }
    });

    app.get('/api/emails/preview/document-rejected', async (req, res) => {
      try {
        const { render } = await import('@react-email/render');
        const { DocumentRejectedEmail } = await import('./emails/DocumentRejectedEmail');
        
        const html = render(DocumentRejectedEmail({
          firstName: 'Alex',
          documentType: 'DRIVERS_LICENSE',
          documentName: 'drivers-license.jpg',
          rejectionReason: 'The image is too blurry to read clearly. Please upload a clearer photo with all text visible.',
          appUrl: env.APP_URL!,
        }));
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.status(500).send('Error rendering email: ' + error);
      }
    });

    app.get('/api/emails/preview/all-documents-approved', async (req, res) => {
      try {
        const { render } = await import('@react-email/render');
        const { AllDocumentsApprovedEmail } = await import('./emails/AllDocumentsApprovedEmail');
        
        const html = render(AllDocumentsApprovedEmail({
          firstName: 'Chris',
          companyName: 'Mountain Peak Cannabis',
          appUrl: env.APP_URL!,
        }));
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.status(500).send('Error rendering email: ' + error);
      }
    });

    app.get('/api/emails/preview/new-user-notification', async (req, res) => {
      try {
        const { render } = await import('@react-email/render');
        const { NewUserNotificationEmail } = await import('./emails/NewUserNotificationEmail');
        
        const html = render(NewUserNotificationEmail({
          firstName: 'Taylor',
          lastName: 'Johnson',
          email: 'taylor@example.com',
          companyName: 'Sunshine Cannabis Co.',
          registrationDate: new Date().toLocaleDateString(),
          appUrl: env.APP_URL!,
        }));
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.status(500).send('Error rendering email: ' + error);
      }
    });

    app.get('/api/emails/preview/new-document-notification', async (req, res) => {
      try {
        const { render } = await import('@react-email/render');
        const { NewDocumentNotificationEmail } = await import('./emails/NewDocumentNotificationEmail');
        
        const html = render(NewDocumentNotificationEmail({
          firstName: 'Jordan',
          lastName: 'Smith',
          email: 'jordan@example.com',
          companyName: 'Valley Green Farms',
          documentType: 'BUSINESS_LICENSE',
          documentName: 'business-license-2024.pdf',
          uploadDate: new Date().toLocaleDateString(),
          appUrl: env.APP_URL!,
        }));
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.status(500).send('Error rendering email: ' + error);
      }
    });

    console.log('📧 Email preview routes available at /api/emails/preview');
  }

  const httpServer = createServer(app);
  return httpServer;
}
