import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, requireAgent, hashPassword } from "./auth";
import { insertDocumentSchema, type InsertMerchantApplication } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadLimiter, adminLimiter, ocrLimiter } from "./middleware/rateLimiting";
import { secureUpload, FileValidator } from "./middleware/fileValidation";
import { EmailService } from "./services/emailService";
import { env } from "./env";
import { cloudflareR2 } from "./services/cloudflareR2";
import { AuditService } from "./services/auditService";
import { IrisCrmService } from "./services/irisCrmService";
import { requireMfaSetup } from "./middleware/mfaRequired";
import { LogSanitizer, safeLog } from "./utils/logSanitizer";
import { SecureDocumentProcessingService } from "./services/documentProcessingService";
import { PIIProtectionService } from "./services/piiProtectionService";
import { triggerBackgroundOcrProcessing } from "./services/backgroundOcrProcessor";

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
    // Agents cannot upload documents
    if (req.user?.role === 'AGENT') {
      return res.status(403).json({ message: "Agents cannot upload documents" });
    }
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

      // Check if all required documents are now uploaded and notify admins (async, don't block response)
      // NOTE: We removed per-document admin notifications - admins only get ONE email when ALL required docs are complete
      EmailService.checkAllRequiredDocumentsUploaded(merchantApplicationId).then(allComplete => {
        if (allComplete) {
          EmailService.sendAllDocumentsCompletedNotificationEmail(user).catch(error => {
            console.error('Failed to send all documents completed notification email:', error);
          });
        }
      }).catch(error => {
        console.error('Failed to check document completion status:', error);
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

      // Trigger background OCR processing (fire-and-forget, doesn't block response)
      if (env.ENABLE_OCR_AUTOFILL) {
        triggerBackgroundOcrProcessing({
          documentId: document.id,
          userId: user.id,
          merchantApplicationId: merchantApplicationId,
          documentType: documentType,
          req,
        });
        console.log(`🔄 Triggered background OCR processing for document: ${document.id}`);
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
      
      console.log('Fetching documents for user:', user.id);
      
      // If user is admin, show all documents for review
      if (user.role === 'ADMIN') {
        const documents = await storage.getAllDocumentsForReview();
        console.log('Admin fetched all documents:', documents.length);
        res.json(documents);
      } else {
        // Show specific client's documents
        let client = await storage.getClientByUserId(user.id);
        if (!client) {
          console.log('Client profile not found for user, creating one:', user.id);
          // Create client record for existing user (migration fix)
          client = await storage.createClient({
            userId: user.id,
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
    // Agents cannot download documents - they can only see status
    if (req.user?.role === 'AGENT') {
      return res.status(403).json({ message: "Agents cannot download documents" });
    }
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
    // Agents cannot delete documents
    if (req.user?.role === 'AGENT') {
      return res.status(403).json({ message: "Agents cannot delete documents" });
    }
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

  // ========================================================================
  // OCR / EXTRACTED DATA ROUTES
  // ========================================================================

  /**
   * POST /api/documents/:id/process
   * Manually trigger OCR processing for a document
   * Requires: Auth + MFA + Rate limit (10 per 15 min per user)
   */
  app.post('/api/documents/:id/process', ocrLimiter, requireAuth, async (req: any, res: Response) => {
    // Agents cannot process documents
    if (req.user?.role === 'AGENT') {
      return res.status(403).json({ message: "Agents cannot process documents" });
    }
    try {
      if (!env.ENABLE_OCR_AUTOFILL) {
        return res.status(503).json({ 
          message: 'OCR autofill is disabled',
          error: 'OCR_FEATURE_DISABLED'
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify MFA is enabled
      if (!user.mfaEnabled && !user.mfaEmailEnabled) {
        return res.status(403).json({ 
          message: "MFA must be enabled to process documents",
          mfaRequired: true
        });
      }

      // Get document
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Verify document ownership
      if (user.role === 'CLIENT') {
        const client = await storage.getClientByUserId(userId);
        if (!client || document.clientId !== client.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Check if extracted data already exists for this document
      const existingData = await storage.getExtractedDocumentDataByDocumentId(id);
      if (existingData) {
        return res.json({
          success: true,
          message: 'Extracted data already exists for this document',
          documentId: document.id,
          extractedDataId: existingData.id,
          status: 'complete',
        });
      }

      // Trigger background OCR processing (fire-and-forget)
      triggerBackgroundOcrProcessing({
        documentId: document.id,
        userId: user.id,
        merchantApplicationId: document.merchantApplicationId || undefined,
        documentType: document.documentType,
        req,
      });

      res.json({
        success: true,
        message: 'OCR processing started',
        documentId: document.id,
        status: 'processing',
      });

    } catch (error) {
      console.error("Error starting OCR processing:", error);
      
      // Log OCR failure
      try {
        const user = await storage.getUser(req.user?.id);
        if (user) {
          await AuditService.logAction(user, 'OCR_EXTRACTION_FAILED', req, {
            resourceType: 'document',
            resourceId: req.params.id,
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
          });
        }
      } catch (auditError) {
        console.error("Failed to log OCR failure:", auditError);
      }

      res.status(500).json({ 
        message: "Failed to start OCR processing",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/documents/:id/ocr-status
   * Get OCR processing status for a document (for polling)
   * Requires: Auth
   */
  app.get('/api/documents/:id/ocr-status', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get document
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Verify document ownership
      if (user.role === 'CLIENT') {
        const client = await storage.getClientByUserId(userId);
        if (!client || document.clientId !== client.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Check for extracted data
      const extractedData = await storage.getExtractedDocumentDataByDocumentId(id);

      if (extractedData) {
        res.json({
          status: 'complete',
          extractedDataId: extractedData.id,
          userReviewed: extractedData.userReviewed,
          appliedToApplication: extractedData.appliedToApplication,
          extractionTimestamp: extractedData.extractionTimestamp,
        });
      } else {
        // No extracted data found - status is processing or not started
        res.json({
          status: 'processing', // or 'not_started' - frontend can check if process was triggered
          extractedDataId: null,
        });
      }

    } catch (error) {
      console.error("Error checking OCR status:", error);
      res.status(500).json({ 
        message: "Failed to check OCR status",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/merchant-applications/:id/extracted-data
   * Get extracted data for review (with decrypted sensitive fields if authorized)
   * Requires: Auth + MFA
   */
  app.get('/api/merchant-applications/:id/extracted-data', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify MFA is enabled
      if (!user.mfaEnabled && !user.mfaEmailEnabled) {
        return res.status(403).json({ 
          message: "MFA must be enabled to view extracted data",
          mfaRequired: true
        });
      }

      // Verify merchant application ownership
      if (user.role === 'CLIENT') {
        const isOwner = await storage.validateMerchantApplicationOwnership(id, userId);
        if (!isOwner) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Get all extracted data for this merchant application
      const extractedDataList = await storage.getExtractedDocumentDataByMerchantApplicationId(id);

      // Check if user wants to view sensitive fields (query param)
      const includeSensitive = req.query.includeSensitive === 'true';

      // Process each extracted data entry
      const processedData = await Promise.all(
        extractedDataList.map(async (extractedData) => {
          const publicData = extractedData.extractedDataPublic as Record<string, any>;
          const encryptedFields = extractedData.encryptedFields as Record<string, string>;

          let fullData = publicData;

          // Decrypt sensitive fields if requested and user is authorized
          if (includeSensitive && Object.keys(encryptedFields).length > 0) {
            try {
              fullData = PIIProtectionService.decryptAndMerge(publicData, encryptedFields);

              // Audit log sensitive data access
              await AuditService.logAction(user, 'OCR_DATA_DECRYPTED', req, {
                resourceType: 'extracted_document_data',
                resourceId: extractedData.id,
                metadata: {
                  merchantApplicationId: id,
                  documentId: extractedData.documentId,
                },
              });
            } catch (decryptError) {
              console.error('Failed to decrypt sensitive fields:', decryptError);
              // Return public data only if decryption fails
            }
          }

          return {
            id: extractedData.id,
            documentId: extractedData.documentId,
            data: includeSensitive ? fullData : publicData,
            userReviewed: extractedData.userReviewed,
            reviewedAt: extractedData.reviewedAt,
            appliedToApplication: extractedData.appliedToApplication,
            appliedAt: extractedData.appliedAt,
            extractionTimestamp: extractedData.extractionTimestamp,
            hasSensitiveFields: Object.keys(encryptedFields).length > 0,
          };
        })
      );

      // Audit log data access
      await AuditService.logAction(user, 'OCR_DATA_REVIEWED', req, {
        resourceType: 'merchant_application',
        resourceId: id,
        metadata: {
          extractedDataCount: extractedDataList.length,
          includeSensitive,
        },
      });

      res.json({
        success: true,
        extractedData: processedData,
        count: processedData.length,
      });

    } catch (error) {
      console.error("Error fetching extracted data:", error);
      res.status(500).json({ 
        message: "Failed to fetch extracted data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/merchant-applications/:id/apply-extracted-data
   * Apply reviewed extracted data to merchant application
   * Requires: Auth + MFA
   */
  app.post('/api/merchant-applications/:id/apply-extracted-data', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { extractedDataId, reviewedFields } = req.body;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify MFA is enabled
      if (!user.mfaEnabled && !user.mfaEmailEnabled) {
        return res.status(403).json({ 
          message: "MFA must be enabled to apply extracted data",
          mfaRequired: true
        });
      }

      // Validate input
      if (!extractedDataId) {
        return res.status(400).json({ message: "extractedDataId is required" });
      }

      if (!reviewedFields || typeof reviewedFields !== 'object') {
        return res.status(400).json({ message: "reviewedFields must be an object" });
      }

      // Verify merchant application ownership
      if (user.role === 'CLIENT') {
        const isOwner = await storage.validateMerchantApplicationOwnership(id, userId);
        if (!isOwner) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Get merchant application
      const merchantApplication = await storage.getMerchantApplicationById(id);
      if (!merchantApplication) {
        return res.status(404).json({ message: "Merchant application not found" });
      }

      // Get extracted data
      const extractedData = await storage.getExtractedDocumentDataById(extractedDataId);
      if (!extractedData) {
        return res.status(404).json({ message: "Extracted data not found" });
      }

      // Verify extracted data belongs to this merchant application
      if (extractedData.merchantApplicationId !== id) {
        return res.status(400).json({ message: "Extracted data does not belong to this merchant application" });
      }

      // Decrypt sensitive fields to get full data
      const publicData = extractedData.extractedDataPublic as Record<string, any>;
      const encryptedFields = extractedData.encryptedFields as Record<string, string>;
      const fullData = PIIProtectionService.decryptAndMerge(publicData, encryptedFields);

      // Map reviewed fields to merchant application fields
      // Only update fields that user confirmed in reviewedFields
      const updateData: Partial<InsertMerchantApplication> = {};

      // Map common fields from reviewedFields to merchant application schema
      if (reviewedFields.legalBusinessName !== undefined) {
        updateData.legalBusinessName = reviewedFields.legalBusinessName || null;
      }
      if (reviewedFields.dbaBusinessName !== undefined) {
        updateData.dbaBusinessName = reviewedFields.dbaBusinessName || null;
      }
      if (reviewedFields.businessAddress !== undefined || reviewedFields.locationAddress !== undefined) {
        updateData.billingAddress = reviewedFields.businessAddress || reviewedFields.locationAddress || null;
        updateData.locationAddress = reviewedFields.locationAddress || reviewedFields.businessAddress || null;
      }
      if (reviewedFields.city !== undefined) {
        updateData.city = reviewedFields.city || null;
      }
      if (reviewedFields.state !== undefined) {
        updateData.state = reviewedFields.state || null;
      }
      if (reviewedFields.zip !== undefined) {
        updateData.zip = reviewedFields.zip || null;
      }
      if (reviewedFields.federalTaxIdNumber !== undefined) {
        updateData.federalTaxIdNumber = reviewedFields.federalTaxIdNumber || null;
      }
      if (reviewedFields.bankName !== undefined) {
        updateData.bankName = reviewedFields.bankName || null;
      }
      if (reviewedFields.routingNumber !== undefined) {
        updateData.abaRoutingNumber = reviewedFields.routingNumber || null;
      }
      if (reviewedFields.accountNumber !== undefined) {
        updateData.ddaNumber = reviewedFields.accountNumber || null;
      }
      if (reviewedFields.accountHolderName !== undefined || reviewedFields.accountName !== undefined) {
        updateData.accountName = reviewedFields.accountHolderName || reviewedFields.accountName || null;
        updateData.nameOnBankAccount = reviewedFields.accountHolderName || reviewedFields.accountName || null;
      }
      if (reviewedFields.monthlySalesVolume !== undefined) {
        updateData.monthlySalesVolume = reviewedFields.monthlySalesVolume?.toString() || null;
      }
      if (reviewedFields.averageTicket !== undefined) {
        updateData.averageTicket = reviewedFields.averageTicket?.toString() || null;
      }
      if (reviewedFields.highTicket !== undefined) {
        updateData.highTicket = reviewedFields.highTicket?.toString() || null;
      }
      if (reviewedFields.incorporationState !== undefined) {
        updateData.incorporationState = reviewedFields.incorporationState || null;
      }
      if (reviewedFields.incorporationDate !== undefined) {
        updateData.entityStartDate = reviewedFields.incorporationDate ? new Date(reviewedFields.incorporationDate) : null;
      }
      if (reviewedFields.ownershipType !== undefined) {
        updateData.ownershipType = reviewedFields.ownershipType || null;
      }

      // Update merchant application with reviewed fields only
      await storage.updateMerchantApplication(id, updateData);

      // Mark extracted data as reviewed and applied
      await storage.updateExtractedDocumentDataReviewed(extractedDataId, true);
      await storage.updateExtractedDocumentDataApplied(extractedDataId, true);

      // Audit log application
      await AuditService.logAction(user, 'OCR_DATA_APPLIED', req, {
        resourceType: 'merchant_application',
        resourceId: id,
        metadata: {
          extractedDataId,
          fieldsApplied: Object.keys(reviewedFields),
        },
      });

      res.json({
        success: true,
        message: 'Extracted data applied to merchant application',
        appliedFields: Object.keys(reviewedFields),
      });

    } catch (error) {
      console.error("Error applying extracted data:", error);
      res.status(500).json({ 
        message: "Failed to apply extracted data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // Admin impersonation routes removed for security

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

  // Admin create agent endpoint
  app.post('/api/admin/create-agent', requireAdmin, async (req: any, res: Response) => {
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

      // Hash password and create agent user
      const hashedPassword = await hashPassword(password);
      const newAgent = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "AGENT",
        mfaRequired: true, // Agents also require MFA
      });

      // Send welcome email to new agent
      EmailService.sendWelcomeEmail(newAgent).catch(error => {
        console.error('Failed to send welcome email to new agent:', error);
      });

      res.status(201).json({
        message: "Agent user created successfully",
        user: {
          id: newAgent.id,
          email: newAgent.email,
          firstName: newAgent.firstName,
          lastName: newAgent.lastName,
          role: newAgent.role,
        },
      });
    } catch (error) {
      console.error("Error creating agent user:", error);
      res.status(500).json({ message: "Failed to create agent user" });
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

  // Get single company details for admin
  app.get('/api/admin/company/:clientId', requireAdmin, async (req: any, res: Response) => {
    try {
      const { clientId } = req.params;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const client = await storage.getClientById(clientId);
      if (!client) {
        return res.status(404).json({ message: "Company not found" });
      }

      const clientUser = await storage.getUser(client.userId);
      if (!clientUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch related data
      const merchantApplications = await storage.getMerchantApplicationsByClientId(clientId);
      const documents = await storage.getDocumentsByClientId(clientId);
      const auditLogs = await AuditService.getUserAuditTrail(client.userId, 100);

      res.json({
        id: client.id,
        companyName: clientUser.companyName,
        status: client.status,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        user: {
          id: clientUser.id,
          firstName: clientUser.firstName,
          lastName: clientUser.lastName,
          email: clientUser.email,
          role: clientUser.role,
          mfaEnabled: clientUser.mfaEnabled,
          mfaEmailEnabled: clientUser.mfaEmailEnabled,
          createdAt: clientUser.createdAt,
        },
        merchantApplications,
        documents,
        auditLogs,
      });
    } catch (error) {
      console.error("Error fetching company details:", error);
      res.status(500).json({ message: "Failed to fetch company details" });
    }
  });

  // Merchant Application routes
  app.post('/api/merchant-applications', requireAuth, async (req: any, res: Response) => {
    // Agents cannot create merchant applications
    if (req.user?.role === 'AGENT') {
      return res.status(403).json({ message: "Agents cannot create merchant applications" });
    }
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

        // Generate date-based temporary name if no business name provided
        const dateBasedName = `Application - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        
        const applicationData = {
          ...sanitizedBody,
          clientId: client.id,
          status: 'DRAFT' as const,
          currentStep: 1, // Start at step 1 (Basic Info)
          // Set temporary date-based name if no business name provided
          dbaBusinessName: sanitizedBody.dbaBusinessName || sanitizedBody.legalBusinessName || dateBasedName,
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
      
      // If user is admin, show all applications for review (masked by default in list view)
      if (user.role === 'ADMIN') {
        // Admins see masked data in list view, request decrypt=true to see full data
        const shouldDecrypt = req.query.decrypt === 'true';
        const applications = await storage.getAllMerchantApplicationsForReview(shouldDecrypt);
        
        // Audit log if admin requested decrypted PII data for bulk view
        if (shouldDecrypt) {
          await AuditService.logAction(user, 'MERCHANT_APP_PII_ACCESSED', req, {
            resourceType: 'merchant_application',
            metadata: { 
              action: 'bulk_view_decrypted_pii',
              applicationCount: applications.length,
            }
          });
        }
        
        res.json(applications);
      } else {
        // Show specific client's applications - clients always see their own data decrypted
        let client = await storage.getClientByUserId(user.id);
        if (!client) {
          console.log('Client profile not found for user, creating one:', user.id);
          // Create client record for existing user (migration fix)
          client = await storage.createClient({
            userId: user.id,
            status: 'PENDING',
          });
          console.log('Created client record:', client.id);
        }
        
        // Clients always get decrypted data (it's their own data)
        const applications = await storage.getMerchantApplicationsByClientId(client.id, true);
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
      
      // Determine if we should decrypt based on user role and query param
      // - Clients always get their own data decrypted
      // - Admins can request decrypted data with ?decrypt=true
      // - Agents see masked data only
      const shouldDecrypt = user.role === 'CLIENT' || 
        (user.role === 'ADMIN' && req.query.decrypt === 'true');
      
      const application = await storage.getMerchantApplicationById(id, shouldDecrypt);
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

      // Audit log if admin requested decrypted PII data
      if (user.role === 'ADMIN' && shouldDecrypt && application.hasEncryptedData) {
        await AuditService.logAction(user, 'MERCHANT_APP_PII_ACCESSED', req, {
          resourceType: 'merchant_application',
          resourceId: id,
          metadata: { 
            action: 'view_decrypted_pii',
            applicationId: id,
            hasEncryptedData: application.hasEncryptedData,
          }
        });
      }

      res.json(application);
    } catch (error) {
      console.error("Error fetching merchant application:", error);
      res.status(500).json({ message: "Failed to fetch merchant application" });
    }
  });

  app.put('/api/merchant-applications/:id', requireAuth, async (req: any, res: Response) => {
    // Agents cannot edit merchant applications
    if (req.user?.role === 'AGENT') {
      return res.status(403).json({ message: "Agents cannot edit merchant applications" });
    }
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
      // ADMIN and PARTNER users can update any application (including pricing terms)

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
    // Agents cannot change application status
    if (req.user?.role === 'AGENT') {
      return res.status(403).json({ message: "Agents cannot change application status" });
    }
    try {
      const { id } = req.params;
      const { status, rejectionReason, sendToKindTap } = req.body;
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

        // CRITICAL: Validate that all required documents are uploaded before submission
        const documents = await storage.getDocumentsByApplicationId(id);
        const requiredDocTypes = [
          'SS4_EIN_LETTER',
          'DRIVERS_LICENSE', 
          'BANK_STATEMENTS',
          'ARTICLES_OF_INCORPORATION',
          'BUSINESS_LICENSE',
          'VOIDED_CHECK',
          'INSURANCE_COVERAGE'
        ];

        const uploadedDocTypes = new Set(documents.map((doc: any) => doc.documentType));
        const missingDocs = requiredDocTypes.filter(docType => !uploadedDocTypes.has(docType));

        if (missingDocs.length > 0) {
          const docNames: Record<string, string> = {
            'SS4_EIN_LETTER': 'SS-4 IRS EIN Confirmation Letter or W9',
            'DRIVERS_LICENSE': "Driver's License or US Passport",
            'BANK_STATEMENTS': '3 Most Recent Business Bank Statements',
            'ARTICLES_OF_INCORPORATION': 'Articles of Incorporation',
            'BUSINESS_LICENSE': 'Business License & State/Local Permits',
            'VOIDED_CHECK': 'Voided Check or Bank Letter',
            'INSURANCE_COVERAGE': 'Insurance Coverage'
          };

          const missingDocNames = missingDocs.map(type => docNames[type] || type).join(', ');
          return res.status(400).json({ 
            message: `Cannot submit application without all required documents. Missing: ${missingDocNames}` 
          });
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
          rejectionReason,
          sendToKindTap: sendToKindTap || false
        }
      });

      // Trigger KindTap webhook if requested and approved
      if (status === 'APPROVED' && sendToKindTap) {
        console.log('🚀 Triggering KindTap webhook for approved application:', id);
        
        // Fetch all documents for this application
        const documents = await storage.getDocumentsByApplicationId(id);
        const client = await storage.getClientById(application.clientId);
        const applicationOwner = client ? await storage.getUser(client.userId) : null;
        
        // Generate the filled merchant application PDF
        console.log('📄 Generating filled merchant application PDF...');
        let filledApplicationPdf: { url: string; r2Key?: string } | null = null;
        
        try {
          const { PdfFillService } = await import('./services/pdfFillService');
          const pdfBuffer = await PdfFillService.fillMerchantApplicationPDF(application);
          console.log(`✅ Generated filled PDF (${pdfBuffer.length} bytes)`);
          
          // Upload to R2 for temporary access
          if (cloudflareR2) {
            try {
              // Save to temp file first
              const tempFilePath = path.join(process.cwd(), 'uploads', `temp-app-${application.id}.pdf`);
              await fs.promises.writeFile(tempFilePath, pdfBuffer);
              
              // Upload to R2
              const r2Result = await cloudflareR2.uploadFile(
                tempFilePath,
                `merchant-application-${application.legalBusinessName || application.dbaBusinessName || application.id}.pdf`,
                application.clientId
              );
              
              // Generate pre-signed URL
              const signedUrl = await cloudflareR2.getDownloadUrl(r2Result.key, 10800); // 3 hours
              filledApplicationPdf = { url: signedUrl, r2Key: r2Result.key };
              
              // Clean up temp file
              await fs.promises.unlink(tempFilePath).catch(() => {});
              
              console.log('✅ Uploaded filled PDF to R2 and generated pre-signed URL');
            } catch (error) {
              console.error('Failed to upload filled PDF to R2:', error);
            }
          }
        } catch (error) {
          console.error('Failed to generate filled PDF:', error);
        }
        
        // Generate pre-signed URLs for all documents (valid for 3 hours)
        console.log(`📝 Generating pre-signed URLs for ${documents.length} documents...`);
        const documentsWithSignedUrls = await Promise.all(
          documents.map(async (doc) => {
            let signedUrl = null;
            
            // Generate pre-signed URL if document is in R2
            if (doc.r2Key && cloudflareR2) {
              try {
                // 3 hours (10800 seconds) - plenty of time for Zapier to download
                signedUrl = await cloudflareR2.getDownloadUrl(doc.r2Key, 10800);
                console.log(`✓ Generated pre-signed URL for ${doc.originalName} (expires in 3 hours)`);
              } catch (error) {
                console.error(`Failed to generate pre-signed URL for document ${doc.id}:`, error);
                // Fallback to API endpoint
                signedUrl = `${req.protocol}://${req.get('host')}/api/documents/${doc.id}/download`;
              }
            } else {
              // Fallback to API endpoint for local files
              signedUrl = `${req.protocol}://${req.get('host')}/api/documents/${doc.id}/download`;
              console.log(`⚠️ Document ${doc.originalName} not in R2, using API endpoint`);
            }
            
            return {
              id: doc.id,
              documentType: doc.documentType,
              originalName: doc.originalName,
              status: doc.status,
              uploadedAt: doc.uploadedAt,
              fileSize: doc.fileSize,
              mimeType: doc.mimeType,
              // Pre-signed URL that Zapier can access directly
              downloadUrl: signedUrl,
              // Metadata
              expiresAt: new Date(Date.now() + 10800 * 1000).toISOString(), // 3 hours from now
            };
          })
        );
        
        // Add the filled application PDF to the documents array
        if (filledApplicationPdf) {
          documentsWithSignedUrls.unshift({
            id: `app-pdf-${application.id}`,
            documentType: 'MERCHANT_APPLICATION_PDF',
            originalName: `Merchant-Application-${application.legalBusinessName || application.dbaBusinessName || application.id}.pdf`,
            status: 'APPROVED',
            uploadedAt: new Date().toISOString(),
            fileSize: 0, // Unknown at this point
            mimeType: 'application/pdf',
            downloadUrl: filledApplicationPdf.url,
            expiresAt: new Date(Date.now() + 10800 * 1000).toISOString(),
            isApplicationPdf: true, // Flag to identify it as the application itself
          });
          console.log('✅ Added filled application PDF to documents array');
        }
        
        console.log(`✅ Generated ${documentsWithSignedUrls.length} pre-signed URLs (including application PDF)`);
        
        // Prepare webhook payload with application and document data
        const webhookPayload = {
          applicationId: application.id,
          status: application.status,
          approvedAt: new Date().toISOString(),
          approvedBy: {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
          },
          merchant: {
            legalBusinessName: application.legalBusinessName,
            dbaBusinessName: application.dbaBusinessName,
            contactName: application.contactName,
            contactEmail: application.contactEmail,
            businessPhone: application.businessPhone,
            federalTaxIdNumber: application.federalTaxIdNumber,
            ownershipType: application.ownershipType,
          },
          owner: applicationOwner ? {
            email: applicationOwner.email,
            firstName: applicationOwner.firstName,
            lastName: applicationOwner.lastName,
            companyName: applicationOwner.companyName,
          } : null,
          documents: documentsWithSignedUrls,
          applicationData: application,
          // Add metadata about URLs
          _metadata: {
            urlsExpireAt: new Date(Date.now() + 10800 * 1000).toISOString(),
            urlsValidFor: '3 hours',
            totalDocuments: documentsWithSignedUrls.length,
            includesFilledApplicationPdf: !!filledApplicationPdf,
          },
          // Security: Include secret token for webhook authentication (flattened for Zapier)
          auth_token: env.ZAPIER_WEBHOOK_SECRET || '',
          auth_timestamp: new Date().toISOString(),
        };

        // Send to KindTap Zapier webhook (async, don't block response)
        const kindTapWebhookUrl = env.ZAPIER_KINDTAP_WEBHOOK_URL;
        if (!kindTapWebhookUrl) {
          console.warn('⚠️  ZAPIER_KINDTAP_WEBHOOK_URL not configured, skipping KindTap webhook');
          return;
        }
        
        fetch(kindTapWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        })
          .then(response => {
            if (response.ok) {
              console.log('✅ KindTap webhook triggered successfully');
            } else {
              console.error('❌ KindTap webhook failed:', response.status, response.statusText);
            }
            return response.json();
          })
          .then(data => {
            console.log('KindTap webhook response:', data);
          })
          .catch(error => {
            console.error('❌ Failed to trigger KindTap webhook:', error);
          });
      }

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
    // Agents cannot delete merchant applications
    if (req.user?.role === 'AGENT') {
      return res.status(403).json({ message: "Agents cannot delete merchant applications" });
    }
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
      // Admins can delete any application (no status restriction)

      // Audit log for admin deletions
      if (user.role === 'ADMIN') {
        await AuditService.logAction(user, 'MERCHANT_APPLICATION_DELETE' as any, req, {
          resourceType: 'merchant_application',
          resourceId: id,
          metadata: { 
            applicationStatus: application.status,
            legalBusinessName: application.legalBusinessName,
            clientId: application.clientId
          }
        });
      }

      await storage.deleteMerchantApplication(id);
      res.json({ message: "Merchant application deleted successfully" });
    } catch (error) {
      console.error("Error deleting merchant application:", error);
      res.status(500).json({ message: "Failed to delete merchant application" });
    }
  });

  // ========================================================================
  // KINDTAP WEBHOOK ROUTE - Send approved applications to Box.com
  // ========================================================================
  
  app.post('/api/merchant-applications/:id/send-to-kindtap', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user;

      // Only admins can send to KindTap
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const application = await storage.getMerchantApplicationById(id);
      if (!application) {
        return res.status(404).json({ message: "Merchant application not found" });
      }

      // Verify application is approved
      if (application.status !== 'APPROVED') {
        return res.status(400).json({ message: "Only approved applications can be sent to KindTap" });
      }

      console.log('🚀 Triggering KindTap webhook for approved application:', id);
      
      // Fetch all documents for this application
      const documents = await storage.getDocumentsByApplicationId(id);
      const client = await storage.getClientById(application.clientId);
      const applicationOwner = client ? await storage.getUser(client.userId) : null;
      
      // Generate the filled merchant application PDF
      console.log('📄 Generating filled merchant application PDF...');
      let filledApplicationPdf: { url: string; r2Key?: string } | null = null;
      
      try {
        const { PdfFillService } = await import('./services/pdfFillService');
        const pdfBuffer = await PdfFillService.fillMerchantApplicationPDF(application);
        console.log(`✅ Generated filled PDF (${pdfBuffer.length} bytes)`);
        
        // Upload to R2 for temporary access
        if (cloudflareR2) {
          try {
            // Save to temp file first
            const tempFilePath = path.join(process.cwd(), 'uploads', `temp-app-${application.id}.pdf`);
            await fs.promises.writeFile(tempFilePath, pdfBuffer);
            
            // Upload to R2
            const r2Result = await cloudflareR2.uploadFile(
              tempFilePath,
              `merchant-application-${application.legalBusinessName || application.dbaBusinessName || application.id}.pdf`,
              application.clientId
            );
            
            // Generate pre-signed URL
            const signedUrl = await cloudflareR2.getDownloadUrl(r2Result.key, 10800); // 3 hours
            filledApplicationPdf = { url: signedUrl, r2Key: r2Result.key };
            
            // Clean up temp file
            await fs.promises.unlink(tempFilePath).catch(() => {});
            
            console.log('✅ Uploaded filled PDF to R2 and generated pre-signed URL');
          } catch (error) {
            console.error('Failed to upload filled PDF to R2:', error);
          }
        }
      } catch (error) {
        console.error('Failed to generate filled PDF:', error);
      }
      
      // Generate pre-signed URLs for all documents (valid for 3 hours)
      console.log(`📝 Generating pre-signed URLs for ${documents.length} documents...`);
      const documentsWithSignedUrls = await Promise.all(
        documents.map(async (doc) => {
          let signedUrl = null;
          
          // Generate pre-signed URL if document is in R2
          if (doc.r2Key && cloudflareR2) {
            try {
              // 3 hours (10800 seconds) - plenty of time for Zapier to download
              signedUrl = await cloudflareR2.getDownloadUrl(doc.r2Key, 10800);
              console.log(`✓ Generated pre-signed URL for ${doc.originalName} (expires in 3 hours)`);
            } catch (error) {
              console.error(`Failed to generate pre-signed URL for document ${doc.id}:`, error);
              // Fallback to API endpoint
              signedUrl = `${req.protocol}://${req.get('host')}/api/documents/${doc.id}/download`;
            }
          } else {
            // Fallback to API endpoint for local files
            signedUrl = `${req.protocol}://${req.get('host')}/api/documents/${doc.id}/download`;
            console.log(`⚠️ Document ${doc.originalName} not in R2, using API endpoint`);
          }
          
          return {
            id: doc.id,
            documentType: doc.documentType,
            originalName: doc.originalName,
            status: doc.status,
            uploadedAt: doc.uploadedAt,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
            // Pre-signed URL that Zapier can access directly
            downloadUrl: signedUrl,
            // Metadata
            expiresAt: new Date(Date.now() + 10800 * 1000).toISOString(), // 3 hours from now
          };
        })
      );
      
      // Add the filled application PDF to the documents array
      if (filledApplicationPdf) {
        documentsWithSignedUrls.unshift({
          id: `app-pdf-${application.id}`,
          documentType: 'MERCHANT_APPLICATION_PDF',
          originalName: `Merchant-Application-${application.legalBusinessName || application.dbaBusinessName || application.id}.pdf`,
          status: 'APPROVED',
          uploadedAt: new Date().toISOString(),
          fileSize: 0, // Unknown at this point
          mimeType: 'application/pdf',
          downloadUrl: filledApplicationPdf.url,
          expiresAt: new Date(Date.now() + 10800 * 1000).toISOString(),
          isApplicationPdf: true, // Flag to identify it as the application itself
        });
        console.log('✅ Added filled application PDF to documents array');
      }
      
      console.log(`✅ Generated ${documentsWithSignedUrls.length} pre-signed URLs (including application PDF)`);
      
      // Prepare webhook payload with application and document data
      const webhookPayload = {
        applicationId: application.id,
        status: application.status,
        approvedAt: application.reviewedAt || new Date().toISOString(),
        sentToKindTapAt: new Date().toISOString(),
        sentBy: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        },
        merchant: {
          legalBusinessName: application.legalBusinessName,
          dbaBusinessName: application.dbaBusinessName,
          contactName: application.contactName,
          contactEmail: application.contactEmail,
          businessPhone: application.businessPhone,
          federalTaxIdNumber: application.federalTaxIdNumber,
          ownershipType: application.ownershipType,
        },
        owner: applicationOwner ? {
          email: applicationOwner.email,
          firstName: applicationOwner.firstName,
          lastName: applicationOwner.lastName,
          companyName: applicationOwner.companyName,
        } : null,
        documents: documentsWithSignedUrls,
        applicationData: application,
        // Add metadata about URLs
        _metadata: {
          urlsExpireAt: new Date(Date.now() + 10800 * 1000).toISOString(),
          urlsValidFor: '3 hours',
          totalDocuments: documentsWithSignedUrls.length,
          includesFilledApplicationPdf: !!filledApplicationPdf,
        },
        // Security: Include secret token for webhook authentication (flattened for Zapier)
        auth_token: env.ZAPIER_WEBHOOK_SECRET || '',
        auth_timestamp: new Date().toISOString(),
      };

      // Send to KindTap Zapier webhook
      const kindTapWebhookUrl = env.ZAPIER_KINDTAP_WEBHOOK_URL;
      if (!kindTapWebhookUrl) {
        throw new Error('ZAPIER_KINDTAP_WEBHOOK_URL not configured');
      }
      
      const webhookResponse = await fetch(kindTapWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        console.error('❌ KindTap webhook failed:', webhookResponse.status, webhookResponse.statusText);
        const errorText = await webhookResponse.text();
        console.error('KindTap webhook error response:', errorText);
        return res.status(500).json({ 
          message: `Failed to send to KindTap: ${webhookResponse.status} ${webhookResponse.statusText}` 
        });
      }

      // Zapier webhooks return plain text, not JSON
      let webhookResult;
      const responseText = await webhookResponse.text();
      console.log('KindTap webhook raw response:', responseText);
      
      try {
        // Try to parse as JSON first
        webhookResult = JSON.parse(responseText);
      } catch (e) {
        // If it's not JSON, use the text response
        webhookResult = { 
          status: 'success', 
          message: responseText,
          raw: responseText 
        };
      }
      
      console.log('✅ KindTap webhook triggered successfully:', webhookResult);

      // Audit log the KindTap send
      await AuditService.logAction(user, 'MERCHANT_APPLICATION_REVIEW', req, {
        resourceType: 'merchant_application',
        resourceId: id,
        metadata: {
          action: 'KINDTAP_SEND',
          applicationId: id,
          documentsCount: documents.length,
          webhookResponse: webhookResult,
          preSignedUrlsGenerated: documentsWithSignedUrls.length
        }
      });

      res.json({ 
        success: true, 
        message: "Application and documents sent to KindTap successfully",
        webhookResponse: webhookResult
      });
    } catch (error) {
      console.error("Error sending to KindTap:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to send to KindTap" 
      });
    }
  });

  // ========================================================================
  // E-SIGNATURE ROUTES - SignNow Integration
  // ========================================================================
  
  app.post('/api/merchant-applications/:id/send-for-signature', requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { includeKindTapAgreement } = req.body; // Get checkbox value from request body
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
      if (includeKindTapAgreement) {
        console.log(`📋 KindTap agreement will be included in the document package`);
      }

      // Step 1: Fill PDF with application data (and optionally merge with KindTap agreement)
      const { PdfFillService } = await import('./services/pdfFillService');
      const filledPdfBuffer = await PdfFillService.fillAndMergeMerchantApplicationPDF(
        application,
        includeKindTapAgreement || false
      );
      console.log(`✅ PDF prepared successfully (${filledPdfBuffer.length} bytes)${includeKindTapAgreement ? ' - includes KindTap agreement' : ''}`);

      // Step 2: Upload PDF to SignNow
      const { SignNowService } = await import('./services/signNowService');
      const documentFilename = includeKindTapAgreement
        ? `merchant-application-with-kindtap-${application.legalBusinessName || application.dbaBusinessName || id}.pdf`
        : `merchant-application-${application.legalBusinessName || application.dbaBusinessName || id}.pdf`;
      
      const documentId = await SignNowService.uploadDocument(
        filledPdfBuffer,
        documentFilename
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
          includeKindTapAgreement: includeKindTapAgreement || false,
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
      const tempPath = path.join(process.cwd(), 'uploads', filename);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'uploads');
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

  // Delete invitation code (admin only)
  app.delete('/api/admin/invitation-codes/:id', requireAdmin, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);

      if (!admin || admin.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get the code before deletion for audit log
      const allCodes = await storage.getAllInvitationCodes();
      const codeToDelete = allCodes.find(c => c.id === id);

      if (!codeToDelete) {
        return res.status(404).json({ message: "Invitation code not found" });
      }

      await storage.deleteInvitationCode(id);

      // Audit log
      await AuditService.logAction(admin, 'INVITATION_CODE_DELETED' as any, req, {
        resourceType: 'invitation_code',
        resourceId: id,
        metadata: { code: codeToDelete.code, label: codeToDelete.label, status: codeToDelete.status }
      });

      res.json({ message: "Invitation code deleted successfully" });
    } catch (error) {
      console.error("Error deleting invitation code:", error);
      res.status(500).json({ message: "Failed to delete invitation code" });
    }
  });

  // Agent-specific invitation code creation
  app.post('/api/agent/invitation-codes', requireAgent, async (req: any, res: Response) => {
    try {
      const { label } = req.body;
      const agentId = req.user.id;
      const agent = await storage.getUser(agentId);

      if (!agent || agent.role !== 'AGENT') {
        return res.status(403).json({ message: "Agent access required" });
      }

      if (!label || label.trim().length === 0) {
        return res.status(400).json({ message: "Label is required (who this code is for)" });
      }

      // Generate a unique, readable invitation code (format: AGT-XXXXXX)
      const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous characters
        let code = 'AGT-';
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

      const invitationCode = await storage.createInvitationCode(code, label.trim(), agentId);

      // Audit log
      await AuditService.logAction(agent, 'INVITATION_CODE_CREATED', req, {
        resourceType: 'invitation_code',
        resourceId: invitationCode.id,
        metadata: { code: invitationCode.code, label: invitationCode.label, createdBy: 'AGENT' }
      });

      res.status(201).json(invitationCode);
    } catch (error) {
      console.error("Error creating invitation code:", error);
      res.status(500).json({ message: "Failed to create invitation code" });
    }
  });

  // Get agent's invitation codes
  app.get('/api/agent/invitation-codes', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      const agent = await storage.getUser(agentId);

      if (!agent || agent.role !== 'AGENT') {
        return res.status(403).json({ message: "Agent access required" });
      }

      // Get all invitation codes and filter for this agent
      const allCodes = await storage.getAllInvitationCodes();
      const agentCodes = allCodes.filter(code => code.createdBy === agentId);

      res.json(agentCodes);
    } catch (error) {
      console.error("Error fetching invitation codes:", error);
      res.status(500).json({ message: "Failed to fetch invitation codes" });
    }
  });

  // Agent user creation (CLIENT role only, no agents or admins)
  app.post('/api/agent/create-user', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      const agent = await storage.getUser(agentId);

      if (!agent || agent.role !== 'AGENT') {
        return res.status(403).json({ message: "Agent access required" });
      }

      const { email, password, firstName, lastName, companyName } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user with CLIENT role only (agents cannot create agents or admins)
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        companyName: companyName || null,
        role: "CLIENT", // Always CLIENT, agents cannot create other roles
        mfaRequired: true,
      });

      // Create client record and associate with this agent
      await storage.createClient({
        userId: user.id,
        status: "PENDING",
        agentId: agentId, // Associate with the agent who created them
      });

      // Audit log
      await AuditService.logAction(agent, 'USER_CREATED', req, {
        resourceType: 'user',
        resourceId: user.id,
        metadata: { 
          email: user.email, 
          role: user.role,
          createdBy: 'AGENT',
          agentId: agentId
        }
      });

      res.status(201).json({ 
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          companyName: user.companyName,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Get users created by this agent
  app.get('/api/agent/users', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      const agent = await storage.getUser(agentId);

      if (!agent || agent.role !== 'AGENT') {
        return res.status(403).json({ message: "Agent access required" });
      }

      // Get all clients associated with this agent
      const clients = await storage.getClientsByAgentId(agentId);
      
      // Map to user data
      const users = clients.map(client => ({
        id: client.user.id,
        email: client.user.email,
        firstName: client.user.firstName,
        lastName: client.user.lastName,
        companyName: client.user.companyName,
        role: client.user.role,
        createdAt: client.user.createdAt,
        clientStatus: client.status,
      }));

      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Agent-specific invitation code creation
  app.post('/api/agent/invitation-codes', requireAgent, async (req: any, res: Response) => {
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

  // Onboarding step update endpoint
  app.put('/api/user/onboarding-step', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { step } = req.body;
      
      // Validate step value
      const validSteps = ['PART1', 'DOCUMENTS', 'PART2', 'REVIEW', 'COMPLETE'];
      if (!step || !validSteps.includes(step)) {
        return res.status(400).json({ message: "Invalid onboarding step" });
      }
      
      // Get current user to check progression
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Validate step progression (can't skip steps)
      const currentStepIndex = validSteps.indexOf(user.onboardingStep || 'PART1');
      const newStepIndex = validSteps.indexOf(step);
      
      // Allow resetting to PART1 when starting a new application (going backwards is allowed)
      // Allow moving forward by 1 step or staying on same step
      // Going backwards (e.g., from COMPLETE to PART1) is allowed for starting fresh
      if (newStepIndex > currentStepIndex + 1) {
        return res.status(400).json({ 
          message: "Cannot skip onboarding steps",
          currentStep: user.onboardingStep,
          requestedStep: step
        });
      }
      
      // Update onboarding step
      const updatedUser = await storage.updateUserOnboardingStep(userId, step);
      
      res.json({ 
        success: true, 
        onboardingStep: updatedUser.onboardingStep 
      });
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      res.status(500).json({ message: "Failed to update onboarding step" });
    }
  });

  // Agent routes - Merchant onboarding assistance
  // Get only merchants brought in by this agent
  app.get('/api/agent/onboarding-merchants', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      const user = await storage.getUser(agentId);

      if (!user || user.role !== 'AGENT') {
        return res.status(403).json({ message: "Agent access required" });
      }

      // Get only clients associated with this agent
      const clients = await storage.getClientsByAgentId(agentId);
      
      // Get merchant applications for agent's clients
      const onboardingMerchants = await Promise.all(
        clients.map(async (client) => {
          // Get merchant application if exists
          const merchantApplications = await storage.getMerchantApplicationsByClientId(client.id);
          const latestApplication = merchantApplications.length > 0 
            ? merchantApplications[merchantApplications.length - 1]
            : null;

          // Get documents to check status
          const documents = await storage.getDocumentsByClientId(client.id);
          const documentStatuses = documents.map(doc => ({
            type: doc.documentType,
            status: doc.status,
          }));

          return {
            id: client.user.id,
            userId: client.user.id,
            clientId: client.id,
            email: client.user.email,
            firstName: client.user.firstName,
            lastName: client.user.lastName,
            companyName: client.user.companyName,
            onboardingStep: client.user.onboardingStep || 'PART1',
            status: client.status || 'PENDING',
            createdAt: client.user.createdAt?.toISOString() || new Date().toISOString(),
            merchantApplicationStatus: latestApplication?.status || null,
            documentStatuses, // Document statuses (not the documents themselves)
          };
        })
      );

      res.json(onboardingMerchants);
    } catch (error) {
      console.error("Error fetching onboarding merchants:", error);
      res.status(500).json({ message: "Failed to fetch onboarding merchants" });
    }
  });

  // Get specific merchant details for agent view (only if merchant belongs to this agent)
  app.get('/api/agent/merchants/:merchantId', requireAgent, async (req: any, res: Response) => {
    try {
      const { merchantId } = req.params;
      const agentId = req.user.id;
      const user = await storage.getUser(agentId);

      if (!user || user.role !== 'AGENT') {
        return res.status(403).json({ message: "Agent access required" });
      }

      // Get merchant user
      const merchantUser = await storage.getUser(merchantId);
      if (!merchantUser) {
        return res.status(404).json({ message: "Merchant not found" });
      }

      // Get client record
      const client = await storage.getClientByUserId(merchantId);
      if (!client) {
        return res.status(404).json({ message: "Client record not found" });
      }

      // Verify this merchant belongs to this agent
      if (client.agentId !== agentId) {
        return res.status(403).json({ message: "You can only view merchants you brought in" });
      }

      // Get merchant applications
      const merchantApplications = await storage.getMerchantApplicationsByClientId(client.id);
      
      // Get documents (status only, not the actual documents)
      const documents = await storage.getDocumentsByClientId(client.id);

      res.json({
        user: {
          id: merchantUser.id,
          email: merchantUser.email,
          firstName: merchantUser.firstName,
          lastName: merchantUser.lastName,
          companyName: merchantUser.companyName,
          onboardingStep: merchantUser.onboardingStep,
          createdAt: merchantUser.createdAt,
        },
        client: {
          id: client.id,
          status: client.status,
          createdAt: client.createdAt,
        },
        merchantApplications: merchantApplications.map(app => ({
          id: app.id,
          status: app.status,
          legalBusinessName: app.legalBusinessName,
          dbaBusinessName: app.dbaBusinessName,
          createdAt: app.createdAt,
          submittedAt: app.submittedAt,
          reviewedAt: app.reviewedAt,
        })),
        documents: documents.map(doc => ({
          id: doc.id,
          documentType: doc.documentType,
          status: doc.status,
          originalName: doc.originalName,
          uploadedAt: doc.uploadedAt,
          // Note: We don't include file paths or actual document content for agents
        })),
      });
    } catch (error) {
      console.error("Error fetching merchant details:", error);
      res.status(500).json({ message: "Failed to fetch merchant details" });
    }
  });

  // Import and register agent-specific routes
  const { registerAgentRoutes } = await import("./routes-agent.js");
  registerAgentRoutes(app);
  const httpServer = createServer(app);
  return httpServer;
}