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
import { IrisCrmService } from "./services/irisCrmService";
import { requireMfaSetup } from "./middleware/mfaRequired";
import { LogSanitizer, safeLog } from "./utils/logSanitizer";

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

  // Cloudflare Zero Trust middleware removed - using built-in auth + MFA

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
      const { documentType, merchantApplicationId } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Require merchantApplicationId for new uploads
      if (!merchantApplicationId) {
        // Clean up uploaded file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(400).json({ 
          message: "Merchant application ID is required. Please select a merchant application before uploading documents." 
        });
      }

      // Validate that the merchant application belongs to this user
      const isOwner = await storage.validateMerchantApplicationOwnership(merchantApplicationId, userId);
      if (!isOwner) {
        // Clean up uploaded file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(403).json({ 
          message: "You don't have permission to upload documents for this merchant application" 
        });
      }

      // Get the merchant application to access its IRIS lead ID
      let merchantApplication = await storage.getMerchantApplicationById(merchantApplicationId);
      if (!merchantApplication) {
        // Clean up uploaded file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(404).json({ message: "Merchant application not found" });
      }

      // Auto-create IRIS lead if merchant application doesn't have one yet (backfill for old apps)
      if (!merchantApplication.irisLeadId) {
        console.log('🔄 Merchant application missing IRIS lead, creating one now...');
        try {
          const { IrisCrmService } = await import('./services/irisCrmService');
          const newLeadId = await IrisCrmService.createLead(user);
          if (newLeadId) {
            await storage.updateMerchantApplicationIrisLeadId(merchantApplication.id, newLeadId);
            const refreshedApp = await storage.getMerchantApplicationById(merchantApplicationId); // Refresh
            if (refreshedApp) {
              merchantApplication = refreshedApp;
              console.log('✅ Created IRIS lead for existing merchant application:', newLeadId);
              
              // Move lead to appropriate stage based on application status
              if (merchantApplication.status === 'SUBMITTED') {
                IrisCrmService.updateLeadStatus(newLeadId, 'SALES_READY_FOR_REVIEW').catch(error => {
                  console.error('Failed to update IRIS CRM lead status:', error);
                });
              } else if (merchantApplication.status === 'DRAFT') {
                IrisCrmService.updateLeadStatus(newLeadId, 'SALES_PRE_SALE').catch(error => {
                  console.error('Failed to update IRIS CRM lead status:', error);
                });
              }
            }
          }
        } catch (error) {
          console.error('❌ Failed to create IRIS lead for merchant application:', error);
        }
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
        merchantApplicationId: merchantApplicationId,
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
      if (merchantApplication.irisLeadId && fs.existsSync(file.path)) {
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
      if (merchantApplication.irisLeadId) {
        import('./services/irisCrmService').then(async ({ IrisCrmService }) => {
          if (r2Key && cloudflareR2) {
            try {
              // Generate signed URL that Zapier can access (24 hour expiry)
              const signedUrl = await cloudflareR2.getDownloadUrl(r2Key, 86400);
              console.log('🔗 Using Cloudflare R2 signed URL for IRIS sync (24h expiry)');
              IrisCrmService.syncDocumentToIrisWithUrl(user, document, merchantApplication.irisLeadId!, signedUrl).catch(error => {
                console.error('Failed to sync document to IRIS CRM with signed URL:', error);
              });
            } catch (error) {
              console.error('Failed to generate signed URL, falling back to base64:', error);
              // Fallback to base64 if signed URL generation fails
              if (fileContentForIris) {
                IrisCrmService.syncDocumentToIrisWithBuffer(user, document, merchantApplication.irisLeadId!, fileContentForIris).catch(error => {
                  console.error('Failed to sync document to IRIS CRM with buffer:', error);
                });
              }
            }
          } else if (fileContentForIris) {
            // Fallback to base64 content when R2 isn't available
            console.log('💾 Using base64 content for IRIS sync (R2 not available)');
            IrisCrmService.syncDocumentToIrisWithBuffer(user, document, merchantApplication.irisLeadId!, fileContentForIris).catch(error => {
              console.error('Failed to sync document to IRIS CRM with buffer:', error);
            });
          } else {
            console.warn('⚠️ No R2 key or file content available for IRIS sync');
          }
        }).catch(error => {
          console.error('Failed to import IRIS CRM service:', error);
        });
      } else {
        console.warn('⚠️ No IRIS lead ID found for merchant application, skipping document sync');
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

      // Set headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Type', document.mimeType);

      // Use R2 if available, fallback to local file
      if (document.r2Key && cloudflareR2) {
        try {
          // Stream from R2 through our server (avoids CORS issues)
          const fileStream = await cloudflareR2.getFileStream(document.r2Key);
          fileStream.pipe(res);
          return;
        } catch (error) {
          console.error('Failed to stream from R2:', error);
          // Fall through to local file handling
        }
      }

      // Fallback to local file system
      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

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
  app.post('/api/admin/create-admin', requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password and create admin user
      const hashedPassword = await hashPassword(password);
      const newAdmin = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "ADMIN",
        mfaRequired: true, // Admins require MFA
      });

      // Send welcome email to new admin
      EmailService.sendWelcomeEmail(newAdmin).catch(error => {
        console.error('Failed to send welcome email to new admin:', error);
      });

      res.status(201).json({
        message: "Admin user created successfully",
        user: {
          id: newAdmin.id,
          email: newAdmin.email,
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          role: newAdmin.role,
        },
      });
    } catch (error) {
      console.error("Error creating admin user:", error);
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });

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

      // Note: IRIS CRM lead will be created when user creates their first merchant application
      // This ensures each merchant application has its own lead in IRIS

      // Send account created email to user (async, don't block response)
      EmailService.sendAccountCreatedEmail(newUser, password).catch(error => {
        console.error('Failed to send account created email:', error);
      });

      // Send new user notification to ALL admins (async, don't block response)
      EmailService.sendNewUserNotificationEmail(newUser).catch(error => {
        console.error('Failed to send new user notification email to admins:', error);
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
            role: client.user.role,
            mfaEnabled: client.user.mfaEnabled,
            mfaEmailEnabled: client.user.mfaEmailEnabled,
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

      // Create IRIS lead for this specific merchant application (async, don't block response)
      import('./services/irisCrmService').then(async ({ IrisCrmService }) => {
        console.log('🔄 Creating new IRIS lead for merchant application:', application.id);
        try {
          const irisLeadId = await IrisCrmService.createLead(user);
          if (irisLeadId) {
            // Store IRIS lead ID on the merchant application
            await storage.updateMerchantApplicationIrisLeadId(application.id, irisLeadId);
            console.log('✅ Created and assigned IRIS lead ID to merchant application:', irisLeadId);
            
            // Move lead to Sales - Pre-Sale (application started)
            IrisCrmService.updateLeadStatus(irisLeadId, 'SALES_PRE_SALE').catch(error => {
              console.error('Failed to update IRIS CRM lead status to SALES_PRE_SALE:', error);
            });

            // Sync application data to IRIS via Zapier webhook
            IrisCrmService.syncMerchantApplicationToIris(user, application, irisLeadId).catch(error => {
              console.error('Failed to sync merchant application to IRIS CRM via Zapier:', error);
            });
            
            // Also update lead fields directly (field ID mapping)
            IrisCrmService.updateLeadWithMerchantApplication(irisLeadId, application).catch(error => {
              console.error('Failed to update IRIS CRM lead fields:', error);
            });
          } else {
            console.warn('⚠️ Failed to create IRIS lead ID for merchant application');
          }
        } catch (error) {
          console.error('❌ Failed to create IRIS lead ID for merchant application:', error);
        }
      }).catch(error => {
        console.error('Failed to import IRIS CRM service:', error);
      });

      res.json(application);
    } catch (error) {
      console.error("Error creating merchant application:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Failed to create merchant application",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
      
      safeLog.log("PUT /api/merchant-applications/:id - Request body:", req.body);
      
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
      
      safeLog.log("PUT /api/merchant-applications/:id - Sanitized body:", sanitizedBody);
      
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
            // USE THE MERCHANT APPLICATION'S LEAD ID (never create duplicates)
            let irisLeadId = application.irisLeadId;
            
            // Only create a new lead if this merchant application doesn't have one yet
            if (!irisLeadId) {
              console.log('🔄 Merchant application missing IRIS lead, creating one now:', application.id);
              try {
                irisLeadId = await IrisCrmService.createLead(applicationOwner);
                if (irisLeadId) {
                  // Store lead ID on the merchant application (not client!)
                  await storage.updateMerchantApplicationIrisLeadId(application.id, irisLeadId);
                  console.log('✅ Created and assigned IRIS lead ID to merchant application:', irisLeadId);
                } else {
                  console.warn('⚠️ Failed to create IRIS lead ID, skipping sync');
                  return;
                }
              } catch (error) {
                console.error('❌ Failed to create IRIS lead ID:', error);
                return;
              }
            } else {
              console.log('✅ Using existing IRIS lead ID from merchant application:', irisLeadId);
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
              // USE THE MERCHANT APPLICATION'S LEAD ID (never create duplicates)
              let irisLeadId = application.irisLeadId;
              
              // Only create a new lead if this merchant application doesn't have one yet
              if (!irisLeadId) {
                console.log('🔄 Merchant application missing IRIS lead, creating one now:', application.id);
                try {
                  irisLeadId = await IrisCrmService.createLead(applicationOwner);
                  if (irisLeadId) {
                    // Store lead ID on the merchant application (not client!)
                    await storage.updateMerchantApplicationIrisLeadId(application.id, irisLeadId);
                    console.log('✅ Created and assigned IRIS lead ID to merchant application:', irisLeadId);
                  } else {
                    console.warn('⚠️ Failed to create IRIS lead ID, skipping sync');
                    return;
                  }
                } catch (error) {
                  console.error('❌ Failed to create IRIS lead ID:', error);
                  return;
                }
              } else {
                console.log('✅ Using existing IRIS lead ID from merchant application:', irisLeadId);
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
              
              // Auto-generate and upload filled PDF to IRIS when approved
              if (status === 'APPROVED') {
                console.log(`📝 Auto-generating filled PDF for approved application ${id}`);
                import('./services/pdfFillService').then(async ({ PdfFillService }) => {
                  try {
                    const filledPdfBuffer = await PdfFillService.fillMerchantApplicationPDF(application);
                    console.log(`✅ PDF generated successfully (${filledPdfBuffer.length} bytes)`);
                    
                    // Upload to IRIS CRM documents
                    const documentId = await IrisCrmService.uploadDocument(
                      irisLeadId,
                      filledPdfBuffer,
                      `merchant-application-${application.legalBusinessName || application.dbaBusinessName || id}.pdf`
                    );
                    console.log(`✅ Filled PDF uploaded to IRIS CRM, document ID: ${documentId}`);
                  } catch (error) {
                    console.error('❌ Failed to generate and upload PDF to IRIS:', error);
                  }
                }).catch(error => {
                  console.error('❌ Failed to import PDF fill service:', error);
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

  // ========================================================================
  // E-SIGNATURE ROUTES - SignNow Integration
  // ========================================================================
  
  app.post('/api/merchant-applications/:id/send-for-signature', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user;

      // Only admins can send for signature
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const application = await storage.getMerchantApplicationById(id);
      if (!application) {
        return res.status(404).json({ message: "Merchant application not found" });
      }

      // Verify application is approved
      if (application.status !== 'APPROVED') {
        return res.status(400).json({ message: "Only approved applications can be sent for signature" });
      }

      // Prevent duplicate signature requests
      if (application.eSignatureStatus === 'PENDING') {
        return res.status(400).json({ message: "E-signature request already pending" });
      }

      if (application.eSignatureStatus === 'SIGNED') {
        return res.status(400).json({ message: "Application already signed" });
      }

      // Get client information for merchant signer
      const client = await storage.getClientById(application.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const clientUser = await storage.getUser(client.userId);
      if (!clientUser) {
        return res.status(404).json({ message: "Client user not found" });
      }

      console.log(`📝 Preparing to send e-signature for application ${id}`);

      // Step 1: Fill PDF with application data
      const { PdfFillService } = await import('./services/pdfFillService');
      const filledPdfBuffer = await PdfFillService.fillMerchantApplicationPDF(application);
      console.log(`✅ PDF filled successfully (${filledPdfBuffer.length} bytes)`);

      // Step 2: Upload PDF to SignNow
      const { SignNowService } = await import('./services/signNowService');
      const documentId = await SignNowService.uploadDocument(
        filledPdfBuffer,
        `merchant-application-${application.legalBusinessName || application.dbaBusinessName || id}.pdf`
      );
      console.log(`✅ Document uploaded to SignNow, document ID: ${documentId}`);

      // Step 3: Send simple freeform invite (no roles/fields required - signers click anywhere to sign)
      const merchantName = `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim() || 'Merchant';
      const adminName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';
      
      // Use SignNow account owner email as sender (required for API)
      const fromEmail = env.SIGNNOW_OWNER_EMAIL || 'submissions@miapayments.com';
      
      await SignNowService.createFreeformInvite(
        documentId,
        clientUser.email, // Merchant signs
        fromEmail, // From email (SignNow account owner)
        'Merchant Application - Signature Required',
        `Please review and sign the merchant application for ${application.legalBusinessName || application.dbaBusinessName || 'your business'}. After you sign, it will be sent to the admin for their signature.`
      );
      console.log(`✅ Signing invite sent to ${clientUser.email} (merchant signs first)`);

      // Step 4: Update application status in database
      await storage.updateMerchantApplicationESignature(id, {
        eSignatureStatus: 'PENDING',
        eSignatureApplicationId: documentId,
        eSignatureSentAt: new Date(),
      });

      // Audit log
      await AuditService.logAction(user, 'MERCHANT_APPLICATION_UPDATE', req, {
        resourceType: 'merchant_application',
        resourceId: id,
        metadata: {
          action: 'send_for_signature',
          merchantEmail: clientUser.email,
          adminEmail: user.email,
        }
      });

      res.json({
        message: "E-signature request sent successfully",
        documentId: documentId,
        signers: [
          { email: clientUser.email, role: 'Merchant', order: 1 },
          { email: user.email, role: 'Admin', order: 2 },
        ],
      });
    } catch (error) {
      console.error("Error sending e-signature request:", error);
      res.status(500).json({ 
        message: "Failed to send e-signature request",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/merchant-applications/:id/signature-status', requireAuth, async (req: any, res: Response) => {
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

      // If no e-signature request has been sent, return current status
      if (!application.eSignatureApplicationId) {
        return res.json({
          status: application.eSignatureStatus || 'NOT_SENT',
          sentAt: null,
          completedAt: null,
          signers: [],
        });
      }

      // Check status with SignNow if pending
      if (application.eSignatureStatus === 'PENDING') {
        try {
          const { SignNowService } = await import('./services/signNowService');
          const signNowStatus = await SignNowService.getDocumentStatus(application.eSignatureApplicationId);
          
          // Update local status if changed
          if (signNowStatus.status !== application.eSignatureStatus) {
            await storage.updateMerchantApplicationESignature(id, {
              eSignatureStatus: signNowStatus.status,
              eSignatureCompletedAt: signNowStatus.status === 'SIGNED' && signNowStatus.completedAt 
                ? new Date(signNowStatus.completedAt) 
                : undefined,
            });
          }

          return res.json({
            status: signNowStatus.status,
            sentAt: application.eSignatureSentAt,
            completedAt: signNowStatus.completedAt || null,
            signers: signNowStatus.signers,
          });
        } catch (error) {
          console.error('Error checking SignNow e-signature status:', error);
          // Fall through to return local status
        }
      }

      // Return local status
      res.json({
        status: application.eSignatureStatus || 'NOT_SENT',
        sentAt: application.eSignatureSentAt,
        completedAt: application.eSignatureCompletedAt,
        signers: [],
      });
    } catch (error) {
      console.error("Error checking signature status:", error);
      res.status(500).json({ message: "Failed to check signature status" });
    }
  });

  app.post('/api/merchant-applications/:id/download-signed-document', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user;

      // Only admins can download signed documents
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const application = await storage.getMerchantApplicationById(id);
      if (!application) {
        return res.status(404).json({ message: "Merchant application not found" });
      }

      if (!application.eSignatureApplicationId) {
        return res.status(400).json({ message: "No e-signature request found" });
      }

      if (application.eSignatureStatus !== 'SIGNED') {
        return res.status(400).json({ message: "Document not signed yet" });
      }

      // Check if we already have the signed document
      if (application.signedDocumentId) {
        const document = await storage.getDocumentById(application.signedDocumentId.toString());
        if (document) {
          return res.json({
            message: "Signed document already downloaded",
            documentId: document.id,
            filename: document.originalName,
          });
        }
      }

      console.log(`📥 Downloading signed document for application ${id}`);

      // Download from SignNow
      const { SignNowService } = await import('./services/signNowService');
      const signedPdfBuffer = await SignNowService.downloadSignedDocument(application.eSignatureApplicationId);
      console.log(`✅ Downloaded signed PDF from SignNow (${signedPdfBuffer.length} bytes)`);

      // Generate filename with "signed-" prefix
      const businessName = (application.legalBusinessName || application.dbaBusinessName || id)
        .replace(/[^a-z0-9-_.]/gi, '_');
      const timestamp = Date.now();
      const filename = `signed-merchant-application-${businessName}-${timestamp}.pdf`;
      const tempPath = path.join(__dirname, '../uploads', filename);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(tempPath, signedPdfBuffer);
      console.log(`✅ Saved signed document locally: ${filename}`);

      // Create document record in our system
      const document = await storage.createDocument({
        filename,
        originalName: `signed-merchant-application-${businessName}.pdf`,
        fileSize: signedPdfBuffer.length,
        mimeType: 'application/pdf',
        filePath: tempPath,
        documentType: 'ARTICLES_OF_INCORPORATION',
        clientId: application.clientId,
        merchantApplicationId: id,
        status: 'APPROVED',
      });
      console.log(`✅ Created document record, ID: ${document.id}`);

      // Upload signed document to IRIS CRM
      if (application.irisLeadId) {
        try {
          await IrisCrmService.uploadDocument(
            application.irisLeadId,
            signedPdfBuffer,
            `signed-merchant-application-${businessName}.pdf`
          );
          console.log(`✅ Uploaded signed document to IRIS CRM for lead ${application.irisLeadId}`);
        } catch (error) {
          console.error('⚠️  Failed to upload signed document to IRIS:', error);
          // Continue even if IRIS upload fails
        }
      }

      // Link document to application
      await storage.updateMerchantApplicationESignature(id, {
        signedDocumentId: parseInt(document.id),
      });

      // Audit log
      await AuditService.logAction(user, 'DOCUMENT_DOWNLOAD', req, {
        resourceType: 'document',
        resourceId: document.id,
        metadata: {
          action: 'download_signed_application',
          merchantApplicationId: id,
          uploadedToIris: !!application.irisLeadId,
        }
      });

      res.json({
        message: "Signed document downloaded and saved successfully",
        documentId: document.id,
        filename: document.originalName,
        uploadedToIris: !!application.irisLeadId,
      });
    } catch (error) {
      console.error("Error downloading signed document:", error);
      res.status(500).json({ 
        message: "Failed to download signed document",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Download filled PDF for approved merchant application
  app.get('/api/merchant-applications/:id/download-pdf', requireAuth, async (req: any, res: Response) => {
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

      // Only allow download for approved applications
      if (application.status !== 'APPROVED') {
        return res.status(400).json({ 
          message: "PDF download is only available for approved applications",
          status: application.status 
        });
      }

      console.log(`📄 Generating PDF for approved application ${id}`);

      // Generate filled PDF
      const { PdfFillService } = await import('./services/pdfFillService');
      const filledPdfBuffer = await PdfFillService.fillMerchantApplicationPDF(application);
      
      console.log(`✅ PDF generated successfully (${filledPdfBuffer.length} bytes)`);

      // Audit log the download
      await AuditService.logAction(user, 'DOCUMENT_DOWNLOAD', req, {
        resourceType: 'merchant_application_pdf',
        resourceId: id,
        metadata: {
          action: 'download_filled_pdf',
          applicationStatus: application.status,
        }
      });

      // Set headers and send PDF
      const filename = `merchant-application-${application.legalBusinessName || application.dbaBusinessName || id}.pdf`
        .replace(/[^a-z0-9-_.]/gi, '_');
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', filledPdfBuffer.length);
      res.send(filledPdfBuffer);

    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ 
        message: "Failed to generate PDF",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MFA (Multi-Factor Authentication) routes
  app.get('/api/mfa/status', requireAuth, async (req: any, res) => {
    try {
      const { MfaService } = await import('./services/mfaService');
      const { EmailMfaService } = await import('./services/emailMfaService');
      
      const totpStatus = await MfaService.getMfaStatus(req.user.id);
      const emailStatus = await EmailMfaService.getEmailMfaStatus(req.user.id);
      
      res.json({
        totp: {
          enabled: totpStatus.enabled,
          setupAt: totpStatus.setupAt,
          lastUsed: totpStatus.lastUsed,
          backupCodesRemaining: totpStatus.backupCodesRemaining,
        },
        email: {
          enabled: emailStatus.enabled,
          setupAt: emailStatus.setupAt,
          lastUsed: emailStatus.lastUsed,
        },
        anyEnabled: totpStatus.enabled || emailStatus.enabled,
      });
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

  // ====== Email MFA Routes ======
  
  // Send OTP for email MFA setup
  app.post('/api/mfa/email/send-setup-otp', requireAuth, async (req: any, res) => {
    try {
      const { EmailMfaService } = await import('./services/emailMfaService');
      const result = await EmailMfaService.sendSetupOtp(req.user.id);
      
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          resetAt: result.resetAt,
        });
      }
    } catch (error) {
      console.error('Failed to send setup OTP:', error);
      res.status(500).json({ message: 'Failed to send OTP email' });
    }
  });

  // Verify OTP and enable email MFA during setup
  app.post('/api/mfa/email/verify-setup-otp', requireAuth, async (req: any, res) => {
    try {
      const { otp, password } = req.body;
      
      if (!otp || !password) {
        return res.status(400).json({ message: 'OTP and password are required' });
      }

      const { EmailMfaService } = await import('./services/emailMfaService');
      const result = await EmailMfaService.verifySetupOtp(req.user.id, otp, password);
      
      if (result.success) {
        // Log email MFA setup completion
        await AuditService.logAction(req.user, 'MFA_SETUP_COMPLETED', req, {
          resourceType: 'user',
          resourceId: req.user.id,
          details: { method: 'email' },
        });

        res.json({ success: true });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Failed to verify setup OTP:', error);
      res.status(500).json({ message: 'Failed to verify OTP' });
    }
  });

  // Send OTP for login
  app.post('/api/mfa/email/send-login-otp', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const { EmailMfaService } = await import('./services/emailMfaService');
      const result = await EmailMfaService.sendLoginOtp(userId);
      
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          resetAt: result.resetAt,
        });
      }
    } catch (error) {
      console.error('Failed to send login OTP:', error);
      res.status(500).json({ message: 'Failed to send OTP email' });
    }
  });

  // Verify OTP for login
  app.post('/api/mfa/email/verify-login-otp', async (req, res) => {
    try {
      const { userId, otp } = req.body;
      
      if (!userId || !otp) {
        return res.status(400).json({ message: 'User ID and OTP are required' });
      }

      const { EmailMfaService } = await import('./services/emailMfaService');
      const result = await EmailMfaService.verifyLoginOtp(userId, otp);
      
      if (result.success) {
        // Log the user in
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Log successful MFA verification
        await AuditService.logAction(user, 'MFA_VERIFICATION_SUCCESS', req, {
          resourceType: 'user',
          resourceId: userId,
          details: { method: 'email' },
        });

        req.login(user, (err: any) => {
          if (err) {
            console.error('Failed to establish session after email MFA:', err);
            return res.status(500).json({ message: 'Failed to establish session' });
          }
          
          const { password: _, ...userWithoutPassword } = user;
          res.json({
            ...userWithoutPassword,
            message: 'MFA verification successful',
          });
        });
      } else {
        // Log failed verification
        const user = await storage.getUser(userId);
        if (user) {
          await AuditService.logAction(user, 'MFA_VERIFICATION_FAILED', req, {
            resourceType: 'user',
            resourceId: userId,
            details: { method: 'email', error: result.error },
          });
        }

        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Failed to verify login OTP:', error);
      res.status(500).json({ message: 'Failed to verify OTP' });
    }
  });

  // Disable email MFA
  app.post('/api/mfa/email/disable', requireAuth, async (req: any, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Current password is required' });
      }

      const { EmailMfaService } = await import('./services/emailMfaService');
      const result = await EmailMfaService.disableEmailMfa(req.user.id, password);
      
      if (result.success) {
        // Log email MFA disable
        await AuditService.logAction(req.user, 'MFA_DISABLED', req, {
          resourceType: 'user',
          resourceId: req.user.id,
          details: { method: 'email' },
        });

        res.json({ success: true });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Failed to disable email MFA:', error);
      res.status(500).json({ message: 'Failed to disable email MFA' });
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

  // ============================================
  // Email MFA Routes
  // ============================================

  /**
   * Enable email MFA - sends initial verification OTP
   */
  app.post('/api/mfa/email/enable', requireAuth, async (req: any, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const userId = req.user!.id;
      const { MfaService } = await import('./services/mfaService');
      
      const result = await MfaService.enableEmailMfa(userId, password);
      
      if (result.success) {
        res.json({ success: true, message: 'Verification code sent to your email' });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Failed to enable email MFA:', error);
      res.status(500).json({ error: 'Failed to enable email MFA' });
    }
  });

  /**
   * Verify and activate email MFA
   */
  app.post('/api/mfa/email/verify-and-activate', requireAuth, async (req: any, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Verification code is required' });
      }

      const userId = req.user!.id;
      const { MfaService } = await import('./services/mfaService');
      
      const result = await MfaService.verifyAndActivateEmailMfa(userId, code);
      
      if (result.success) {
        // Log email MFA enabled
        const user = await storage.getUser(userId);
        if (user) {
          await AuditService.logAction(user, 'MFA_EMAIL_ENABLED', req, {
            resourceType: 'user',
            resourceId: userId,
          });
        }

        res.json({ success: true, message: 'Email MFA enabled successfully' });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Failed to activate email MFA:', error);
      res.status(500).json({ error: 'Failed to activate email MFA' });
    }
  });

  /**
   * Disable email MFA
   */
  app.post('/api/mfa/email/disable', requireAuth, async (req: any, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const userId = req.user!.id;
      const { MfaService } = await import('./services/mfaService');
      
      const result = await MfaService.disableEmailMfa(userId, password);
      
      if (result.success) {
        // Log email MFA disabled
        const user = await storage.getUser(userId);
        if (user) {
          await AuditService.logAction(user, 'MFA_EMAIL_DISABLED', req, {
            resourceType: 'user',
            resourceId: userId,
          });
        }

        res.json({ success: true, message: 'Email MFA disabled successfully' });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Failed to disable email MFA:', error);
      res.status(500).json({ error: 'Failed to disable email MFA' });
    }
  });

  /**
   * Send email OTP for login (public endpoint - no auth required)
   */
  app.post('/api/mfa/email/send-login-otp', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.mfaEmailEnabled) {
        return res.status(400).json({ error: 'Email MFA is not enabled for this user' });
      }

      const { MfaService } = await import('./services/mfaService');
      const result = await MfaService.sendEmailOtp(userId, user.email);
      
      if (result.success) {
        // Log OTP sent
        await AuditService.logAction(user, 'MFA_EMAIL_OTP_SENT', req, {
          resourceType: 'user',
          resourceId: userId,
        });

        res.json({ 
          success: true, 
          message: 'Verification code sent to your email',
          expiresAt: result.expiresAt,
        });
      } else {
        // Log rate limit exceeded if applicable
        if (result.error?.includes('Rate limit')) {
          await AuditService.logAction(user, 'MFA_EMAIL_RATE_LIMIT_EXCEEDED', req, {
            resourceType: 'user',
            resourceId: userId,
          });
        }

        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Failed to send login OTP:', error);
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  });

  /**
   * Verify MFA with method selection (TOTP or Email)
   */
  app.post('/api/mfa/verify-with-method', async (req, res) => {
    try {
      const { userId, code, method } = req.body;
      
      if (!userId || !code || !method) {
        return res.status(400).json({ error: 'User ID, code, and method are required' });
      }

      if (method !== 'totp' && method !== 'email') {
        return res.status(400).json({ error: 'Invalid method. Must be "totp" or "email"' });
      }

      const { MfaService } = await import('./services/mfaService');
      const result = await MfaService.verifyMfaForLoginWithMethod(userId, code, method);
      
      if (result.success) {
        // Get the user and log them in
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Log successful MFA verification
        await AuditService.logAction(user, 'MFA_VERIFICATION_SUCCESS', req, {
          resourceType: 'user',
          resourceId: userId,
          metadata: { method, isBackupCode: result.isBackupCode },
        });

        // Actually log the user in by establishing a session
        req.login(user, (err) => {
          if (err) {
            console.error('Failed to establish session after MFA:', err);
            return res.status(500).json({ error: 'Failed to establish session' });
          }

          // Return full user data (without password) so frontend can cache it
          const { password: _, ...userWithoutPassword } = user;
          res.json({
            ...userWithoutPassword,
            mfaVerified: true,
            usedBackupCode: result.isBackupCode,
            mfaMethod: method,
          });
        });
      } else {
        // Log failed MFA verification
        const user = await storage.getUser(userId);
        if (user) {
          await AuditService.logAction(user, 'MFA_VERIFICATION_FAILED', req, {
            resourceType: 'user',
            resourceId: userId,
            metadata: { method },
          });
        }

        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Failed to verify MFA with method:', error);
      res.status(500).json({ error: 'Failed to verify MFA' });
    }
  });

  // ========================================================================
  // INVITATION CODE ROUTES - Merchant Onboarding
  // ========================================================================

  // Generate new invitation code (admin only)
  app.post('/api/admin/invitation-codes', requireAdmin, async (req: any, res: Response) => {
    try {
      const { label } = req.body;
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);

      if (!admin || admin.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!label || label.trim().length === 0) {
        return res.status(400).json({ message: "Label is required (who this code is for)" });
      }

      // Generate a unique, readable invitation code (format: INV-XXXXXX)
      const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous characters
        let code = 'INV-';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      // Ensure code is unique
      let code = generateCode();
      let existingCode = await storage.getInvitationCodeByCode(code);
      while (existingCode) {
        code = generateCode();
        existingCode = await storage.getInvitationCodeByCode(code);
      }

      const invitationCode = await storage.createInvitationCode(code, label.trim(), adminId);

      // Audit log
      await AuditService.logAction(admin, 'INVITATION_CODE_CREATED', req, {
        resourceType: 'invitation_code',
        resourceId: invitationCode.id,
        metadata: { code: invitationCode.code, label: invitationCode.label }
      });

      res.status(201).json(invitationCode);
    } catch (error) {
      console.error("Error creating invitation code:", error);
      res.status(500).json({ message: "Failed to create invitation code" });
    }
  });

  // Get all invitation codes (admin only)
  app.get('/api/admin/invitation-codes', requireAdmin, async (req: any, res: Response) => {
    try {
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);

      if (!admin || admin.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const codes = await storage.getAllInvitationCodes();
      res.json(codes);
    } catch (error) {
      console.error("Error fetching invitation codes:", error);
      res.status(500).json({ message: "Failed to fetch invitation codes" });
    }
  });

  // Validate invitation code (public endpoint - used during signup)
  app.post('/api/invitation-codes/validate', async (req: Request, res: Response) => {
    try {
      const { code } = req.body;

      if (!code || code.trim().length === 0) {
        return res.status(400).json({ message: "Invitation code is required" });
      }

      const invitationCode = await storage.getInvitationCodeByCode(code.trim().toUpperCase());

      if (!invitationCode) {
        return res.status(404).json({ message: "Invalid invitation code" });
      }

      if (invitationCode.status === 'USED') {
        return res.status(400).json({ message: "This invitation code has already been used" });
      }

      if (invitationCode.status === 'EXPIRED') {
        return res.status(400).json({ message: "This invitation code has expired" });
      }

      res.json({ 
        valid: true, 
        message: "Invitation code is valid",
        label: invitationCode.label 
      });
    } catch (error) {
      console.error("Error validating invitation code:", error);
      res.status(500).json({ message: "Failed to validate invitation code" });
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
