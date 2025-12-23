/**
 * Background OCR Processor Service
 * 
 * Handles asynchronous OCR processing of uploaded documents without blocking
 * the upload response. Processes documents in the background and stores
 * extracted data for review.
 * 
 * Features:
 * - Fetches documents from R2 or filesystem
 * - Processes documents asynchronously
 * - Handles errors gracefully (doesn't fail upload)
 * - Stores extracted data with PII encryption
 * - Audit logging for compliance
 */

import { storage } from "../storage";
import { SecureDocumentProcessingService, ProcessingOptions } from "./documentProcessingService";
import { PIIProtectionService } from "./piiProtectionService";
import { AuditService } from "./auditService";
import { cloudflareR2 } from "./cloudflareR2";
import { env } from "../env";
import fs from "fs";
import crypto from "crypto";
import type { Request } from "express";

interface ProcessDocumentOptions {
  documentId: string;
  userId: string;
  merchantApplicationId: string;
  documentType: string;
  req?: Request; // For audit logging (IP address, user agent)
}

/**
 * Process a document in the background (fire-and-forget)
 * This function is called asynchronously and doesn't block the response
 */
export async function processDocumentInBackground(
  options: ProcessDocumentOptions
): Promise<void> {
  const { documentId, userId, merchantApplicationId, documentType, req } = options;

  try {
    // Get document from database
    const document = await storage.getDocumentById(documentId);
    if (!document) {
      console.error(`❌ Document not found: ${documentId}`);
      return;
    }

    // Get user for audit logging
    const user = await storage.getUser(userId);
    if (!user) {
      console.error(`❌ User not found: ${userId}`);
      return;
    }

    // Check if OCR is enabled
    if (!env.ENABLE_OCR_AUTOFILL) {
      console.log(`⏭️  OCR autofill is disabled, skipping processing for document: ${documentId}`);
      return;
    }

    // Check if extracted data already exists for this document
    const existingData = await storage.getExtractedDocumentDataByDocumentId(documentId);
    if (existingData) {
      console.log(`⏭️  Extracted data already exists for document: ${documentId}`);
      return;
    }

    // Audit log OCR start (only if req is provided - background processing may not have req)
    // Note: OCR_EXTRACTION_STARTED is already logged in the trigger endpoint, so this is optional
    if (req) {
      try {
        await AuditService.logAction(user, 'OCR_EXTRACTION_STARTED', req, {
          resourceType: 'document',
          resourceId: documentId,
          metadata: {
            documentType: document.documentType,
            filename: document.originalName,
          },
        });
      } catch (auditError) {
        console.error('Failed to log OCR start:', auditError);
        // Don't fail processing if audit logging fails
      }
    }

    console.log(`🔄 Starting OCR processing for document: ${documentId} (${document.originalName})`);

    // Get file buffer (from R2 or filesystem)
    let fileBuffer: Buffer;
    let mimeType: string = document.mimeType || 'application/pdf';

    if (document.r2Key && cloudflareR2) {
      // Fetch from R2
      console.log(`📥 Fetching document from R2: ${document.r2Key}`);
      try {
        const fileStream = await cloudflareR2.getFileStream(document.r2Key);
        
        // AWS SDK v3 returns a Readable stream (Node.js stream)
        // Convert stream to buffer by collecting chunks
        const chunks: Buffer[] = [];
        for await (const chunk of fileStream as any) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        fileBuffer = Buffer.concat(chunks);
        
        console.log(`✅ Retrieved ${fileBuffer.length} bytes from R2`);
      } catch (error) {
        console.error(`❌ Failed to fetch document from R2: ${error}`);
        throw new Error(`Failed to fetch document from R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (document.filePath && fs.existsSync(document.filePath)) {
      // Read from filesystem
      console.log(`📥 Reading document from filesystem: ${document.filePath}`);
      try {
        fileBuffer = fs.readFileSync(document.filePath);
        console.log(`✅ Read ${fileBuffer.length} bytes from filesystem`);
      } catch (error) {
        console.error(`❌ Failed to read document from filesystem: ${error}`);
        throw new Error(`Failed to read document from filesystem: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.error(`❌ No file source available for document: ${documentId} (R2 key: ${document.r2Key}, file path: ${document.filePath})`);
      throw new Error('No file source available (neither R2 key nor file path)');
    }

    // Process document with OCR
    const processingOptions: ProcessingOptions = {
      documentType: documentType || document.documentType,
      mimeType: mimeType,
      userId,
      merchantApplicationId,
    };

    console.log(`🔍 Processing document with type: ${processingOptions.documentType}`);
    const result = await SecureDocumentProcessingService.processDocument(
      fileBuffer,
      processingOptions
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'OCR processing failed');
    }

    console.log(`✅ OCR processing completed for document: ${documentId}`);

    // Separate public and encrypted data
    const { public: publicData, encrypted: encryptedFields } = 
      PIIProtectionService.separatePublicAndEncrypted(result.data);

    // Create document hash for deduplication
    const documentHash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    // Extract confidence score from result data
    const confidenceScore = result.data.confidence 
      ? result.data.confidence.toFixed(2)
      : result.confidenceScore?.toFixed(2) || undefined;

    // Store extracted data in database
    const extractedData = await storage.createExtractedDocumentData({
      documentId,
      merchantApplicationId,
      userId,
      extractedDataPublic: publicData,
      encryptedFields,
      documentHash,
      confidenceScore,
      processingIpAddress: req?.ip || req?.socket?.remoteAddress || undefined,
      processingUserAgent: req?.get('user-agent') || undefined,
    });

    console.log(`💾 Extracted data saved: ${extractedData.id}`);

    // Audit log OCR success (only if req is provided)
    if (req) {
      await AuditService.logAction(user, 'OCR_EXTRACTION_COMPLETED', req, {
        resourceType: 'document',
        resourceId: documentId,
        metadata: {
          documentType: document.documentType,
          filename: document.originalName,
          extractedDataId: extractedData.id,
          confidenceScore: confidenceScore ? parseFloat(confidenceScore) : undefined,
        },
      });
    }

    // Auto-apply extracted data if confidence is high enough (>= 95%)
    const confidence = confidenceScore ? parseFloat(confidenceScore) : undefined;
    if (confidence && confidence >= 0.95 && merchantApplicationId) {
      try {
        const { autoApplyExtractedData } = await import('./autoApplyExtractedData');
        const autoApplied = await autoApplyExtractedData(
          extractedData.id,
          merchantApplicationId,
          userId,
          confidence,
          req
        );
        if (autoApplied) {
          console.log(`✅ Auto-applied extracted data to merchant application: ${merchantApplicationId}`);
        }
      } catch (autoApplyError) {
        console.error('Failed to auto-apply extracted data:', autoApplyError);
        // Don't fail the OCR processing if auto-apply fails
      }
    } else if (confidence && confidence < 0.95) {
      console.log(`⏭️  Skipping auto-apply: confidence score ${confidence} is below 95% threshold (requires manual review)`);
    }

    // Clear file buffer from memory
    fileBuffer = Buffer.alloc(0);

    console.log(`✅ Background OCR processing completed successfully for document: ${documentId}`);
  } catch (error) {
    console.error(`❌ Background OCR processing failed for document ${documentId}:`, error);

    // Audit log OCR failure
    try {
      const user = await storage.getUser(userId);
      if (user && req) {
        await AuditService.logAction(user, 'OCR_EXTRACTION_FAILED', req, {
          resourceType: 'document',
          resourceId: documentId,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            documentType: documentType,
          },
        });
      }
    } catch (auditError) {
      console.error('Failed to log OCR failure:', auditError);
    }

    // Don't throw - we want OCR failures to be silent (not break the upload)
    // The error is already logged above
  }
}

/**
 * Trigger background OCR processing (fire-and-forget)
 * This function returns immediately and processes in the background
 */
export function triggerBackgroundOcrProcessing(
  options: ProcessDocumentOptions
): void {
  // Use setImmediate to process in the next event loop tick
  // This ensures the function returns immediately
  setImmediate(() => {
    processDocumentInBackground(options).catch((error) => {
      // Already handled in processDocumentInBackground, but catch here
      // just in case to prevent unhandled promise rejection
      console.error('Unhandled error in background OCR processing:', error);
    });
  });
}

