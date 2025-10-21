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
import { requireMfaSetup } from "./middleware/mfaRequired";
import { verifyCloudflareAccess, requireAdminAccess, requireEmailDomain, checkTokenExpiration } from "./middleware/cloudflareAccess";

// File upload configuration is now handled in fileValidation middleware

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for monitoring (MUST be before auth middleware)
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

  // Auth middleware
  await setupAuth(app);

  // Apply Cloudflare Access verification in production
  // NOTE: Disabled for now - Cloudflare Access JWT verification requires traffic to flow through
  // Cloudflare's authentication gateway first, which doesn't happen with direct Fly.io access.
  // The app's existing login + MFA provides robust security.
  if (false && env.NODE_ENV === 'production' && env.CLOUDFLARE_ACCESS_AUD) {
    console.log('🔒 Cloudflare Zero Trust enabled - applying access verification');
    
    // Apply Cloudflare Access verification to all API routes EXCEPT /api/health
    app.use('/api', (req, res, next) => {
      if (req.path === '/health') {
        return next(); // Skip Cloudflare verification for health checks
      }
      return verifyCloudflareAccess(req, res, next);
    });
    
    // Apply token expiration checking
    app.use('/api', checkTokenExpiration);
    
    // Apply admin-specific access controls
    app.use('/api/admin', requireAdminAccess(['secure2send-admins']));
    
    // Apply email domain restrictions (optional - uncomment if needed)
    // app.use('/api', requireEmailDomain(['yourdomain.com', 'partnerdomain.com']));
  }

  // Apply MFA requirement middleware after authentication is set up
  app.use(requireMfaSetup);

  // Auth routes are now handled in auth.ts

  // Document routes
  app.post('/api/documents', uploadLimiter, requireAuth, secureUpload.single('file'), async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'CLIENT') {
        return res.status(403).json({ message: "Access denied" });
      }

      let client = await storage.getClientByUserId(userId);
      if (!client) {
        console.log('Client profile not found for user, creating one:', userId);
        // Create client record for existing user (migration fix)
        client = await storage.createClient({
          userId: userId,
          status: 'PENDING',
        });
        console.log('Created client record:', client.id);
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

      // Send document uploaded confirmation email to user (async, don't block response)
      EmailService.sendDocumentUploadedEmail(user, document).catch(error => {
        console.error('Failed to send document uploaded email:', error);
      });

      // Send new document notification to admins (async, don't block response)
      EmailService.sendNewDocumentNotificationEmail(user, document).catch(error => {
        console.error('Failed to send new document notification email:', error);
      });

      // Sync document to IRIS CRM via Zapier webhook (async, don't block response)
      // Read file content before potential cleanup
      let fileContentForIris: Buffer | null = null;
      if (client.irisLeadId && fs.existsSync(file.path)) {
        try {
          fileContentForIris = fs.readFileSync(file.path);
        } catch (error) {
          console.error('Failed to read file for IRIS sync:', error);
        }
      }

      // Clean up local file after R2 upload (if successful)
      if (r2Key && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Failed to clean up local file:', error);
        }
      }

      // Now sync to IRIS CRM - prefer R2 URL, fallback to buffer
      if (client.irisLeadId) {
        import('./services/irisCrmService').then(async ({ IrisCrmService }) => {
          if (r2Key && cloudflareR2) {
            try {
              // Generate signed URL that Zapier can access (24 hour expiry)
              const signedUrl = await cloudflareR2.getDownloadUrl(r2Key, 86400);
              console.log('🔗 Using Cloudflare R2 signed URL for IRIS sync (24h expiry)');
              IrisCrmService.syncDocumentToIrisWithUrl(user, document, client.irisLeadId!, signedUrl).catch(error => {
                console.error('Failed to sync document to IRIS CRM with signed URL:', error);
              });
            } catch (error) {
              console.error('Failed to generate signed URL, falling back to base64:', error);
              // Fallback to base64 if signed URL generation fails
              if (fileContentForIris) {
                IrisCrmService.syncDocumentToIrisWithBuffer(user, document, client.irisLeadId!, fileContentForIris).catch(error => {
                  console.error('Failed to sync document to IRIS CRM with buffer:', error);
                });
              }
            }
          } else if (fileContentForIris) {
            // Fallback to base64 content when R2 isn't available
            console.log('💾 Using base64 content for IRIS sync (R2 not available)');
            IrisCrmService.syncDocumentToIrisWithBuffer(user, document, client.irisLeadId!, fileContentForIris).catch(error => {
              console.error('Failed to sync document to IRIS CRM with buffer:', error);
            });
          } else {
            console.warn('⚠️ No R2 key or file content available for IRIS sync');
          }
        }).catch(error => {
          console.error('Failed to import IRIS CRM service:', error);
        });
      } else {
        console.warn('⚠️ No IRIS lead ID found for client, skipping document sync');
      }

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
        let client = await storage.getClientByUserId(targetUserId);
        if (!client) {
          console.log('Client profile not found for user, creating one:', targetUserId);
          // Create client record for existing user (migration fix)
          client = await storage.createClient({
            userId: targetUserId,
            status: 'PENDING',
          });
          console.log('Created client record:', client.id);
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

  app.delete('/api/admin/users/:id', requireAdmin, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);

      if (!admin || admin.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Prevent admin from deleting themselves
      if (id === adminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Check if user exists
      const userToDelete = await storage.getUser(id);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }

      // Debug logging
      console.log("Delete user attempt:", {
        userToDeleteId: id,
        userToDeleteEmail: userToDelete.email,
        userToDeleteRole: userToDelete.role,
        adminId: adminId,
        adminEmail: admin.email,
        adminRole: admin.role
      });

      // Prevent deleting other admin users
      if (userToDelete.role === 'ADMIN') {
        return res.status(400).json({ message: "Cannot delete admin users" });
      }

      // Audit log the deletion (commented out until USER_DELETE enum is added)
      // await AuditService.logAction(admin, 'USER_DELETE', req, {
      //   resourceType: 'user',
      //   resourceId: id,
      //   metadata: { 
      //     deletedUserEmail: userToDelete.email,
      //     deletedUserRole: userToDelete.role 
      //   }
      // });

      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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

  // Security dashboard endpoint for admin
  app.get('/api/admin/security/dashboard', requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const timeRange = req.query.timeRange as 'day' | 'week' | 'month' || 'day';
      const { SecurityMonitoringService } = await import('./services/securityMonitoring');
      const securityData = await SecurityMonitoringService.getSecurityDashboard(timeRange);

      res.json(securityData);
    } catch (error) {
      console.error("Error fetching security dashboard:", error);
      res.status(500).json({ message: "Failed to fetch security dashboard" });
    }
  });

  // Audit logs endpoint for admin
  app.get('/api/admin/audit-logs', requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const targetUserId = req.query.userId as string;

      let auditLogs;
      if (targetUserId) {
        auditLogs = await AuditService.getUserAuditTrail(targetUserId, limit);
      } else {
        auditLogs = await AuditService.getRecentAuditLogs(limit);
      }

      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
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

      // Create IRIS CRM lead (async, don't block response)
      import('./services/irisCrmService').then(({ IrisCrmService }) => {
        IrisCrmService.createLead(newUser).then(leadId => {
          if (leadId) {
            // Update client with IRIS lead ID
            storage.updateClientIrisLeadId(client.id, leadId).catch(error => {
              console.error('Failed to update client with IRIS lead ID:', error);
            });
          }
        }).catch(error => {
          console.error('Failed to create IRIS CRM lead:', error);
        });
      }).catch(error => {
        console.error('Failed to import IRIS CRM service:', error);
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

  // Merchant Application routes
  app.post('/api/merchant-applications', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'CLIENT') {
        return res.status(403).json({ message: "Access denied" });
      }

      let client = await storage.getClientByUserId(userId);
      if (!client) {
        console.log('Client profile not found for user, creating one:', userId);
        // Create client record for existing user (migration fix)
        client = await storage.createClient({
          userId: userId,
          status: 'PENDING',
        });
        console.log('Created client record:', client.id);
      }

        // CRITICAL: Remove all problematic null/undefined date fields before processing
        const sanitizedBody = { ...req.body };
        const problematicDateFields = [
          'merchantDate', 'corduroDate', 'merchantSignatureDate', 'partnerSignatureDate',
          'createdAt', 'updatedAt', 'submittedAt', 'reviewedAt', 'lastSavedAt', 'reviewedBy', 'rejectionReason'
        ];
        
        // Remove null/undefined date fields and other problematic fields
        problematicDateFields.forEach(field => {
          if (sanitizedBody[field] === null || sanitizedBody[field] === undefined) {
            delete sanitizedBody[field];
          }
        });

        const applicationData = {
          ...sanitizedBody,
          clientId: client.id,
          status: 'DRAFT' as const,
        };

      const application = await storage.createMerchantApplication(applicationData);

      // Audit log the creation
      await AuditService.logAction(user, 'MERCHANT_APPLICATION_CREATE', req, {
        resourceType: 'merchant_application',
        resourceId: application.id,
        metadata: { applicationId: application.id, status: 'DRAFT' }
      });

      // Move IRIS lead to Sales - Pre-Sale when application is created (async, don't block response)
      import('./services/irisCrmService').then(async ({ IrisCrmService }) => {
        let irisLeadId = client.irisLeadId;
        
        // Create IRIS lead ID if it doesn't exist
        if (!irisLeadId) {
          console.log('🔄 No IRIS lead ID found, creating new lead for client:', client.id);
          try {
            irisLeadId = await IrisCrmService.createLead(user);
            if (irisLeadId) {
              await storage.updateClientIrisLeadId(client.id, irisLeadId);
              console.log('✅ Created and assigned IRIS lead ID:', irisLeadId);
            } else {
              console.warn('⚠️ Failed to create IRIS lead ID, skipping IRIS sync');
              return;
            }
          } catch (error) {
            console.error('❌ Failed to create IRIS lead ID:', error);
            return;
          }
        }
        
        // Move lead to Sales - Pre-Sale (application started)
        IrisCrmService.updateLeadStatus(irisLeadId, 'SALES_PRE_SALE').catch(error => {
          console.error('Failed to update IRIS CRM lead status to SALES_PRE_SALE:', error);
        });
      }).catch(error => {
        console.error('Failed to import IRIS CRM service:', error);
      });

      res.json(application);
    } catch (error) {
      console.error("Error creating merchant application:", error);
      res.status(500).json({ message: "Failed to create merchant application" });
    }
  });

  app.get('/api/merchant-applications', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      let targetUserId = user.id;
      
      // If admin is impersonating, use the impersonated user's data
      if (user.role === 'ADMIN' && req.session.isImpersonating && req.session.impersonatedUserId) {
        targetUserId = req.session.impersonatedUserId;
      }
      
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // If the original user is admin and NOT impersonating, show all applications for review
      if (user.role === 'ADMIN' && !req.session.isImpersonating) {
        const applications = await storage.getAllMerchantApplicationsForReview();
        res.json(applications);
      } else {
        // Show specific client's applications
        let client = await storage.getClientByUserId(targetUserId);
        if (!client) {
          console.log('Client profile not found for user, creating one:', targetUserId);
          // Create client record for existing user (migration fix)
          client = await storage.createClient({
            userId: targetUserId,
            status: 'PENDING',
          });
          console.log('Created client record:', client.id);
        }
        
        const applications = await storage.getMerchantApplicationsByClientId(client.id);
        res.json(applications);
      }
    } catch (error) {
      console.error("Error fetching merchant applications:", error);
      res.status(500).json({ message: "Failed to fetch merchant applications" });
    }
  });

  app.get('/api/merchant-applications/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      const application = await storage.getMerchantApplicationById(id);
      if (!application) {
        return res.status(404).json({ message: "Merchant application not found" });
      }

      // Check access permissions
      if (user.role === 'CLIENT') {
        const client = await storage.getClientByUserId(user.id);
        if (!client || application.clientId !== client.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(application);
    } catch (error) {
      console.error("Error fetching merchant application:", error);
      res.status(500).json({ message: "Failed to fetch merchant application" });
    }
  });

  app.put('/api/merchant-applications/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      console.log("PUT /api/merchant-applications/:id - Request body:", JSON.stringify(req.body, null, 2));
      
      // CRITICAL: Remove all problematic null/undefined date fields before processing
      const sanitizedBody = { ...req.body };
      const problematicDateFields = [
        'merchantDate', 'corduroDate', 'merchantSignatureDate', 'partnerSignatureDate',
        'createdAt', 'updatedAt', 'submittedAt', 'reviewedAt', 'lastSavedAt', 'reviewedBy', 'rejectionReason'
      ];
      
      // Remove null/undefined date fields and other problematic fields
      problematicDateFields.forEach(field => {
        if (sanitizedBody[field] === null || sanitizedBody[field] === undefined) {
          delete sanitizedBody[field];
          console.log(`Removed problematic field: ${field}`);
        }
      });
      
      console.log("PUT /api/merchant-applications/:id - Sanitized body:", JSON.stringify(sanitizedBody, null, 2));
      
      const existingApplication = await storage.getMerchantApplicationById(id);
      if (!existingApplication) {
        return res.status(404).json({ message: "Merchant application not found" });
      }

      // Check access permissions
      if (user.role === 'CLIENT') {
        const client = await storage.getClientByUserId(user.id);
        if (!client || existingApplication.clientId !== client.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        // Clients can only update draft applications
        if (existingApplication.status !== 'DRAFT') {
          return res.status(400).json({ message: "Cannot modify submitted application" });
        }
      }

      const application = await storage.updateMerchantApplication(id, sanitizedBody);

      // Audit log the update
      await AuditService.logAction(user, 'MERCHANT_APPLICATION_UPDATE', req, {
        resourceType: 'merchant_application',
        resourceId: id,
        metadata: { applicationId: id, changes: Object.keys(sanitizedBody) }
      });

      // Sync merchant application to IRIS CRM via Zapier webhook (async, don't block response)
      const client = await storage.getClientById(application.clientId);
      if (client) {
        const applicationOwner = await storage.getUser(client.userId);
        if (applicationOwner) {
          import('./services/irisCrmService').then(async ({ IrisCrmService }) => {
            let irisLeadId = client.irisLeadId;
            
            // Create IRIS lead ID if it doesn't exist
            if (!irisLeadId) {
              console.log('🔄 No IRIS lead ID found, creating new lead for client:', client.id);
              try {
                irisLeadId = await IrisCrmService.createLead(applicationOwner);
                if (irisLeadId) {
                  // Update client with the new IRIS lead ID
                  await storage.updateClientIrisLeadId(client.id, irisLeadId);
                  console.log('✅ Created and assigned IRIS lead ID:', irisLeadId);
                } else {
                  console.warn('⚠️ Failed to create IRIS lead ID, skipping sync');
                  return;
                }
              } catch (error) {
                console.error('❌ Failed to create IRIS lead ID:', error);
                return;
              }
            }
            
            // Note: Pipeline stage updates happen in the status change endpoint or on creation
            // Don't update pipeline here as it could conflict with explicit status changes
            
            // Sync via Zapier webhook (comprehensive payload)
            IrisCrmService.syncMerchantApplicationToIris(applicationOwner, application, irisLeadId).catch(error => {
              console.error('Failed to sync merchant application to IRIS CRM via Zapier:', error);
            });
            
            // Also update lead fields directly (field ID mapping)
            IrisCrmService.updateLeadWithMerchantApplication(irisLeadId, application).catch(error => {
              console.error('Failed to update IRIS CRM lead with field mapping:', error);
            });
          }).catch(error => {
            console.error('Failed to import IRIS CRM service:', error);
          });
        }
      } else {
        console.warn('⚠️ No client found for merchant application, skipping IRIS CRM sync');
      }

      res.json(application);
    } catch (error) {
      console.error("Error updating merchant application:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to update merchant application" });
    }
  });

  app.put('/api/merchant-applications/:id/status', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const user = req.user;

      const existingApplication = await storage.getMerchantApplicationById(id);
      if (!existingApplication) {
        return res.status(404).json({ message: "Merchant application not found" });
      }

      const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Only clients can submit their own draft applications
      if (status === 'SUBMITTED' && user.role === 'CLIENT') {
        const client = await storage.getClientByUserId(user.id);
        if (!client || existingApplication.clientId !== client.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        if (existingApplication.status !== 'DRAFT') {
          return res.status(400).json({ message: "Can only submit draft applications" });
        }
      }

      // Only admins can review applications
      if (['UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(status) && user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (status === 'REJECTED' && !rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const application = await storage.updateMerchantApplicationStatus(id, status, rejectionReason);

      // Audit log the status change
      await AuditService.logAction(user, 'MERCHANT_APPLICATION_REVIEW', req, {
        resourceType: 'merchant_application',
        resourceId: id,
        metadata: {
          applicationId: id,
          oldStatus: existingApplication.status,
          newStatus: status,
          rejectionReason
        }
      });

      // Sync merchant application to IRIS CRM via Zapier webhook (async, don't block response)
      // Trigger on any status change (SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED)
      if (['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(status)) {
        const client = await storage.getClientById(application.clientId);
        if (client) {
          const applicationOwner = await storage.getUser(client.userId);
          if (applicationOwner) {
            import('./services/irisCrmService').then(async ({ IrisCrmService }) => {
              let irisLeadId = client.irisLeadId;
              
              // Create IRIS lead ID if it doesn't exist
              if (!irisLeadId) {
                console.log('🔄 No IRIS lead ID found, creating new lead for client:', client.id);
                try {
                  irisLeadId = await IrisCrmService.createLead(applicationOwner);
                  if (irisLeadId) {
                    // Update client with the new IRIS lead ID
                    await storage.updateClientIrisLeadId(client.id, irisLeadId);
                    console.log('✅ Created and assigned IRIS lead ID:', irisLeadId);
                  } else {
                    console.warn('⚠️ Failed to create IRIS lead ID, skipping sync');
                    return;
                  }
                } catch (error) {
                  console.error('❌ Failed to create IRIS lead ID:', error);
                  return;
                }
              }
              
              // Update IRIS pipeline stage based on application status
              const pipelineStageMap: Record<string, keyof typeof IrisCrmService['PIPELINE_STAGES']> = {
                'DRAFT': 'SALES_PRE_SALE',
                'SUBMITTED': 'SALES_READY_FOR_REVIEW',
                'UNDER_REVIEW': 'SALES_READY_FOR_REVIEW', // Keep in Sales - Ready for Review during admin review
                'APPROVED': 'UNDERWRITING_READY_FOR_REVIEW',
                'REJECTED': 'SALES_DECLINED',
              };

              const pipelineStage = pipelineStageMap[status];
              if (pipelineStage) {
                IrisCrmService.updateLeadStatus(irisLeadId, pipelineStage).catch(error => {
                  console.error(`Failed to update IRIS CRM lead status to ${pipelineStage}:`, error);
                });
              }
              
              // Sync via Zapier webhook (comprehensive payload)
              IrisCrmService.syncMerchantApplicationToIris(applicationOwner, application, irisLeadId).catch(error => {
                console.error('Failed to sync merchant application to IRIS CRM via Zapier:', error);
              });
              
              // Also update lead fields directly (field ID mapping)
              IrisCrmService.updateLeadWithMerchantApplication(irisLeadId, application).catch(error => {
                console.error('Failed to update IRIS CRM lead with field mapping:', error);
              });
            }).catch(error => {
              console.error('Failed to import IRIS CRM service:', error);
            });
          }
        } else {
          console.warn('⚠️ No client found for merchant application, skipping IRIS CRM sync');
        }
      }

      res.json(application);
    } catch (error) {
      console.error("Error updating merchant application status:", error);
      res.status(500).json({ message: "Failed to update merchant application status" });
    }
  });

  app.delete('/api/merchant-applications/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user;

      const application = await storage.getMerchantApplicationById(id);
      if (!application) {
        return res.status(404).json({ message: "Merchant application not found" });
      }

      // Check access permissions
      if (user.role === 'CLIENT') {
        const client = await storage.getClientByUserId(user.id);
        if (!client || application.clientId !== client.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        // Clients can only delete draft applications
        if (application.status !== 'DRAFT') {
          return res.status(400).json({ message: "Cannot delete submitted application" });
        }
      }

      await storage.deleteMerchantApplication(id);
      res.json({ message: "Merchant application deleted successfully" });
    } catch (error) {
      console.error("Error deleting merchant application:", error);
      res.status(500).json({ message: "Failed to delete merchant application" });
    }
  });

  // MFA (Multi-Factor Authentication) routes
  app.get('/api/mfa/status', requireAuth, async (req: any, res) => {
    try {
      const { MfaService } = await import('./services/mfaService');
      const status = await MfaService.getMfaStatus(req.user.id);
      res.json(status);
    } catch (error) {
      console.error('Failed to get MFA status:', error);
      res.status(500).json({ message: 'Failed to get MFA status' });
    }
  });

  app.post('/api/mfa/setup/generate', requireAuth, async (req: any, res) => {
    try {
      const { MfaService } = await import('./services/mfaService');
      const { secret, qrCodeUrl, manualEntryKey } = MfaService.generateSecret(req.user.email);
      const qrCodeDataUrl = await MfaService.generateQRCode(qrCodeUrl);
      
      res.json({
        secret,
        qrCodeDataUrl,
        manualEntryKey,
      });
    } catch (error) {
      console.error('Failed to generate MFA setup:', error);
      res.status(500).json({ message: 'Failed to generate MFA setup' });
    }
  });

  app.post('/api/mfa/setup/verify', requireAuth, async (req: any, res) => {
    try {
      const { secret, token } = req.body;
      
      if (!secret || !token) {
        return res.status(400).json({ message: 'Secret and token are required' });
      }

      const { MfaService } = await import('./services/mfaService');
      const result = await MfaService.enableMfa(req.user.id, secret, token);
      
      if (result.success) {
        // Log MFA setup completion
        await AuditService.logAction(req.user, 'MFA_SETUP_COMPLETED', req, {
          resourceType: 'user',
          resourceId: req.user.id,
        });

        res.json({
          success: true,
          backupCodes: result.backupCodes,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Failed to verify MFA setup:', error);
      res.status(500).json({ message: 'Failed to verify MFA setup' });
    }
  });

  app.post('/api/mfa/disable', requireAuth, async (req: any, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Current password is required' });
      }

      const { MfaService } = await import('./services/mfaService');
      const result = await MfaService.disableMfa(req.user.id, password);
      
      if (result.success) {
        // Log MFA disable
        await AuditService.logAction(req.user, 'MFA_DISABLED', req, {
          resourceType: 'user',
          resourceId: req.user.id,
        });

        res.json({ success: true });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      res.status(500).json({ message: 'Failed to disable MFA' });
    }
  });

  app.post('/api/mfa/backup-codes/regenerate', requireAuth, async (req: any, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Current password is required' });
      }

      const { MfaService } = await import('./services/mfaService');
      const result = await MfaService.regenerateBackupCodes(req.user.id, password);
      
      if (result.success) {
        res.json({
          success: true,
          backupCodes: result.backupCodes,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error);
      res.status(500).json({ message: 'Failed to regenerate backup codes' });
    }
  });

  app.post('/api/mfa/verify', async (req, res) => {
    try {
      const { userId, code } = req.body;
      
      if (!userId || !code) {
        return res.status(400).json({ message: 'User ID and code are required' });
      }

      const { MfaService } = await import('./services/mfaService');
      const result = await MfaService.verifyMfaForLogin(userId, code);
      
      if (result.success) {
        // Log successful MFA verification
        const user = await storage.getUser(userId);
        if (user) {
          await AuditService.logAction(user, 'MFA_VERIFICATION_SUCCESS', req, {
            resourceType: 'user',
            resourceId: userId,
            metadata: { isBackupCode: result.isBackupCode },
          });
        }

        res.json({
          success: true,
          isBackupCode: result.isBackupCode,
        });
      } else {
        // Log failed MFA verification
        const user = await storage.getUser(userId);
        if (user) {
          await AuditService.logAction(user, 'MFA_VERIFICATION_FAILED', req, {
            resourceType: 'user',
            resourceId: userId,
          });
        }

        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Failed to verify MFA:', error);
      res.status(500).json({ message: 'Failed to verify MFA' });
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
          companyName: 'Example Co.',
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
          documentType: 'BUSINESS_LICENSE',
          documentName: 'business-license.pdf',
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
          companyName: 'Mountain Peak Co.',
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
          companyName: 'Sunshine Co.',
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

  // Health check endpoint for Fly.io monitoring
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
