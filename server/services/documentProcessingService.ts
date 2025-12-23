/**
 * Secure Document Processing Service using OpenAI GPT-4 Vision
 * 
 * This service extracts structured data from uploaded documents using OCR/AI,
 * with security measures including metadata stripping, image optimization,
 * and secure memory cleanup.
 */

import OpenAI from 'openai';
import sharp from 'sharp';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { env } from '../env';
import type {
  ProcessingOptions,
  ProcessingResult,
  ExtractedW9Data,
  ExtractedBankingData,
  ExtractedBankStatementData,
  ExtractedIDData,
  ExtractedBusinessLicenseData,
  ExtractedArticlesOfIncorporationData,
  ExtractedSS4EINLetterData,
  ExtractedBeneficialOwnershipData,
  ExtractedDocumentData,
} from '../types/ocr';

const OPENAI_TIMEOUT_MS = 30000; // 30 seconds
const MAX_IMAGE_SIZE = 4096; // Max dimension in pixels (GPT-4 Vision supports up to 4096x4096)

/**
 * Secure Document Processing Service
 */
export class SecureDocumentProcessingService {
  private static openaiClient: OpenAI | null = null;

  /**
   * Initialize OpenAI client (lazy initialization)
   */
  private static getOpenAIClient(): OpenAI | null {
    if (!env.ENABLE_OCR_AUTOFILL || !env.OPENAI_API_KEY_OCR_ONLY) {
      return null;
    }

    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: env.OPENAI_API_KEY_OCR_ONLY,
        organization: env.OPENAI_ORG_ID,
        timeout: OPENAI_TIMEOUT_MS,
        maxRetries: 2,
      });
    }

    return this.openaiClient;
  }

  /**
   * Main entry point: Process document and extract structured data
   */
  static async processDocument(
    fileBuffer: Buffer,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    let processedBuffer: Buffer | null = null;

    try {
      // Check if OCR is enabled
      if (!env.ENABLE_OCR_AUTOFILL) {
        return {
          success: false,
          data: null,
          documentHash: this.generateDocumentHash(fileBuffer),
          error: 'OCR autofill is disabled',
        };
      }

      const client = this.getOpenAIClient();
      if (!client) {
        return {
          success: false,
          data: null,
          documentHash: this.generateDocumentHash(fileBuffer),
          error: 'OpenAI API key not configured',
        };
      }

      // Generate document hash for tracking
      const documentHash = this.generateDocumentHash(fileBuffer);

      // Process and optimize image (PDFs are passed through unchanged)
      processedBuffer = await this.prepareImageForOCR(fileBuffer, options.mimeType);

      // Get document-specific extraction prompt
      const prompt = this.getExtractionPrompt(options.documentType);

      // Call GPT-4 Vision API
      const extractedData = await this.extractDataWithVision(
        client,
        processedBuffer,
        prompt,
        options.documentType,
        options.mimeType
      );

      // Validate and structure the extracted data
      const validatedData = this.validateAndStructureData(
        extractedData,
        options.documentType
      );

      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;

      // Clear sensitive buffers from memory
      this.clearBuffer(fileBuffer);
      if (processedBuffer && processedBuffer !== fileBuffer) {
        this.clearBuffer(processedBuffer);
      }

      return {
        success: true,
        data: validatedData,
        documentHash,
        confidenceScore: validatedData.confidence,
        processingTimeMs,
      };
    } catch (error) {
      // Clear buffers on error
      this.clearBuffer(fileBuffer);
      if (processedBuffer && processedBuffer !== fileBuffer) {
        this.clearBuffer(processedBuffer);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Document processing error:', errorMessage);

      return {
        success: false,
        data: null,
        documentHash: this.generateDocumentHash(fileBuffer),
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Prepare image for OCR: strip metadata, optimize size
   * For PDFs: we'll use the Files API instead of base64 encoding
   */
  private static async prepareImageForOCR(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<Buffer> {
    try {
      // Handle PDFs - return as-is, will be processed via Files API
      if (mimeType === 'application/pdf') {
        // Check PDF size (max 50MB for OpenAI)
        if (fileBuffer.length > 50 * 1024 * 1024) {
          throw new Error('PDF file exceeds 50MB limit for OCR processing');
        }
        return fileBuffer; // PDFs handled separately via Files API
      }

      // Process images: strip EXIF metadata and optimize
      const image = sharp(fileBuffer);

      // Get image metadata
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Resize if too large (maintain aspect ratio)
      let resizeOptions: sharp.ResizeOptions | undefined;
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        resizeOptions = {
          width: width > height ? MAX_IMAGE_SIZE : undefined,
          height: height > width ? MAX_IMAGE_SIZE : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        };
      }

      // Strip metadata and optimize
      let pipeline = image
        .removeAlpha() // Remove transparency to reduce size
        .jpeg({ quality: 85, mozjpeg: true }) // Convert to JPEG with good quality
        .withMetadata({ exif: {} }); // Remove all EXIF data

      if (resizeOptions) {
        pipeline = pipeline.resize(resizeOptions);
      }

      const optimizedBuffer = await pipeline.toBuffer();

      return optimizedBuffer;
    } catch (error) {
      console.warn('⚠️  Image optimization failed, using original:', error);
      return fileBuffer; // Fallback to original
    }
  }

  /**
   * Extract data using GPT-4o API
   * Supports both images (via base64) and PDFs (via Files API)
   */
  private static async extractDataWithVision(
    client: OpenAI,
    fileBuffer: Buffer,
    prompt: string,
    documentType: string,
    originalMimeType: string
  ): Promise<any> {
    const isPdf = originalMimeType === 'application/pdf';

    try {
      if (isPdf) {
        // Use OpenAI Files API for PDFs (native PDF support in GPT-4o)
        return await this.extractDataFromPdf(client, fileBuffer, prompt);
      } else {
        // Use base64 encoding for images
        return await this.extractDataFromImage(client, fileBuffer, prompt);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('OCR processing timeout (30s exceeded)');
      }
      throw error;
    }
  }

  /**
   * Extract data from image using base64 encoding
   */
  private static async extractDataFromImage(
    client: OpenAI,
    fileBuffer: Buffer,
    prompt: string
  ): Promise<any> {
    const base64Data = fileBuffer.toString('base64');
    const mimeType = 'image/jpeg';

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured data from business documents. Always respond with valid JSON only, no additional text or markdown formatting.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      temperature: 0.0,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI API');
    }

    return JSON.parse(content);
  }

  /**
   * Extract data from PDF using OpenAI Files API
   * GPT-4o natively supports PDF input
   */
  private static async extractDataFromPdf(
    client: OpenAI,
    pdfBuffer: Buffer,
    prompt: string
  ): Promise<any> {
    let tempFilePath: string | null = null;
    let uploadedFileId: string | null = null;

    try {
      // Create a temporary file for the PDF
      const tempDir = os.tmpdir();
      tempFilePath = path.join(tempDir, `ocr-temp-${Date.now()}.pdf`);
      fs.writeFileSync(tempFilePath, pdfBuffer);

      // Upload PDF to OpenAI Files API
      const file = await client.files.create({
        file: fs.createReadStream(tempFilePath),
        purpose: 'assistants', // Use 'assistants' purpose for file processing
      });
      uploadedFileId = file.id;

      console.log(`📤 Uploaded PDF to OpenAI: ${uploadedFileId}`);

      // Use the Responses API with file input (GPT-4o native PDF support)
      // Note: As of late 2024, GPT-4o supports PDFs directly via file_id
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured data from business documents. Always respond with valid JSON only, no additional text or markdown formatting.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'file',
                file: {
                  file_id: uploadedFileId,
                },
              } as any, // Type assertion needed for newer API features
            ],
          },
        ],
        temperature: 0.0,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI API');
      }

      return JSON.parse(content);
    } finally {
      // Cleanup: Delete temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          console.warn('Failed to delete temp file:', e);
        }
      }

      // Cleanup: Delete uploaded file from OpenAI
      if (uploadedFileId) {
        try {
          await client.files.delete(uploadedFileId);
          console.log(`🗑️  Deleted file from OpenAI: ${uploadedFileId}`);
        } catch (e) {
          console.warn('Failed to delete OpenAI file:', e);
        }
      }
    }
  }

  /**
   * Get document-type-specific extraction prompt
   */
  private static getExtractionPrompt(documentType: string): string {
    const prompts: Record<string, string> = {
      W9: `Extract all data from this W-9 tax form. Return a JSON object with these exact fields (use null for missing values):
{
  "legalBusinessName": "string or null",
  "dbaBusinessName": "string or null",
  "federalTaxIdNumber": "string (EIN or SSN, format: XX-XXXXXXX) or null",
  "businessAddress": "string or null",
  "city": "string or null",
  "state": "string (2-letter state code) or null",
  "zip": "string (5 or 9 digits) or null",
  "signerName": "string (full name) or null",
  "signerSSN": "string (format: XXX-XX-XXXX) or null",
  "businessType": "SOLE_PROPRIETOR|PARTNERSHIP|LLC|CORPORATION|S_CORP|PARTNERSHIP_LLP or null",
  "confidence": "number (0-1, your confidence in the extraction)"
}

Extract all visible text accurately. For tax ID, use EIN if present, otherwise SSN.`,

      VOIDED_CHECK: `Extract all banking information from this voided check. Return a JSON object with these exact fields:
{
  "bankName": "string or null",
  "routingNumber": "string (9 digits, bottom left) or null",
  "accountNumber": "string (bottom center, after routing number) or null",
  "accountHolderName": "string (name on account) or null",
  "accountHolderFirstName": "string (first name from account holder) or null",
  "accountHolderLastName": "string (last name from account holder) or null",
  "address": "string (address on check if visible) or null",
  "city": "string or null",
  "state": "string (2-letter code) or null",
  "zip": "string or null",
  "confidence": "number (0-1)"
}

The routing number is typically the first 9-digit number at the bottom left. The account number follows it.`,

      BANK_STATEMENTS: `Extract banking and transaction data from this bank statement. Calculate monthly volume and transaction statistics. Return JSON:
{
  "bankName": "string or null",
  "accountNumber": "string (masked account number if shown) or null",
  "accountHolderName": "string or null",
  "statementPeriod": "string (e.g., 'January 2024') or null",
  "startDate": "string (YYYY-MM-DD) or null",
  "endDate": "string (YYYY-MM-DD) or null",
  "totalDeposits": "number (sum of all deposits in statement period) or null",
  "transactionCount": "number (total number of transactions) or null",
  "largestTransaction": "number (highest single transaction amount) or null",
  "averageTransaction": "number (average transaction amount) or null",
  "monthlySalesVolume": "number (total deposits, same as totalDeposits) or null",
  "confidence": "number (0-1)"
}

Calculate all monetary values. If multiple months are shown, use the most recent complete month.`,

      DRIVERS_LICENSE: `Extract all information from this driver's license. Return JSON:
{
  "fullName": "string (full legal name) or null",
  "firstName": "string or null",
  "lastName": "string or null",
  "dob": "string (YYYY-MM-DD format) or null",
  "address": "string (full street address) or null",
  "city": "string or null",
  "state": "string (2-letter state code) or null",
  "zip": "string (5 or 9 digits) or null",
  "licenseNumber": "string (license/DL number) or null",
  "expirationDate": "string (YYYY-MM-DD) or null",
  "issueDate": "string (YYYY-MM-DD) or null",
  "issuingState": "string (2-letter state code) or null",
  "idType": "DRIVERS_LICENSE",
  "confidence": "number (0-1)"
}

Parse dates carefully from common formats (MM/DD/YYYY, MM-DD-YYYY, etc.).`,

      PASSPORT: `Extract information from this passport. Return JSON:
{
  "fullName": "string (full name as shown) or null",
  "firstName": "string or null",
  "lastName": "string or null",
  "dob": "string (YYYY-MM-DD) or null",
  "address": "string or null",
  "city": "string or null",
  "state": "string or null",
  "zip": "string or null",
  "licenseNumber": "string (passport number) or null",
  "expirationDate": "string (YYYY-MM-DD) or null",
  "issueDate": "string (YYYY-MM-DD) or null",
  "issuingState": "string (country code if US, otherwise null) or null",
  "idType": "PASSPORT",
  "confidence": "number (0-1)"
}`,

      BUSINESS_LICENSE: `Extract business information from this business license. Return JSON:
{
  "legalBusinessName": "string or null",
  "dbaBusinessName": "string (DBA/doing business as name) or null",
  "businessAddress": "string (business address) or null",
  "locationAddress": "string (physical location if different) or null",
  "city": "string or null",
  "state": "string (2-letter code) or null",
  "zip": "string or null",
  "licenseNumber": "string (license number) or null",
  "licenseType": "string (type of license) or null",
  "issueDate": "string (YYYY-MM-DD) or null",
  "expirationDate": "string (YYYY-MM-DD) or null",
  "businessType": "string or null",
  "confidence": "number (0-1)"
}`,

      ARTICLES_OF_INCORPORATION: `Extract corporate information from these articles of incorporation. Return JSON:
{
  "legalBusinessName": "string (exact legal name) or null",
  "incorporationState": "string (2-letter state code where incorporated) or null",
  "incorporationDate": "string (YYYY-MM-DD) or null",
  "entityStartDate": "string (YYYY-MM-DD, same as incorporationDate) or null",
  "ownershipType": "LLC|CORPORATION_PRIVATELY_HELD|CORPORATION_PUBLICLY_TRADED|S_CORP|PARTNERSHIP_LLP or null",
  "registeredAgentName": "string or null",
  "registeredAgentAddress": "string or null",
  "registeredAgentCity": "string or null",
  "registeredAgentState": "string or null",
  "registeredAgentZip": "string or null",
  "confidence": "number (0-1)"
}

Determine ownership type from document language (LLC, Corporation, S-Corp, etc.).`,

      SS4_EIN_LETTER: `Extract information from this SS-4 EIN confirmation letter from the IRS. Return JSON:
{
  "einNumber": "string (EIN in format XX-XXXXXXX) or null",
  "legalBusinessName": "string (exact business name as shown) or null",
  "businessAddress": "string or null",
  "city": "string or null",
  "state": "string (2-letter code) or null",
  "zip": "string or null",
  "confidence": "number (0-1)"
}

The EIN number is the primary identifier on this document.`,

      BENEFICIAL_OWNERSHIP: `Extract beneficial ownership information from this form. Return JSON with an array of owners:
{
  "owners": [
    {
      "fullName": "string or null",
      "firstName": "string or null",
      "lastName": "string or null",
      "ownershipPercentage": "number (0-100) or null",
      "ssn": "string (XXX-XX-XXXX format) or null",
      "dob": "string (YYYY-MM-DD) or null",
      "address": "string or null",
      "city": "string or null",
      "state": "string or null",
      "zip": "string or null",
      "title": "string or null"
    }
  ],
  "confidence": "number (0-1)"
}

Extract all owners listed. Ownership percentage should total to 100% or less.`,
    };

    return prompts[documentType] || prompts.W9; // Default to W9 if type not found
  }

  /**
   * Validate and structure extracted data based on document type
   */
  private static validateAndStructureData(
    extractedData: any,
    documentType: string
  ): ExtractedDocumentData {
    // Ensure confidence is a number
    if (typeof extractedData.confidence !== 'number') {
      extractedData.confidence = 0.5; // Default to medium confidence
    }

    // Clip confidence to 0-1 range
    extractedData.confidence = Math.max(0, Math.min(1, extractedData.confidence));

    // Type-specific validation
    switch (documentType) {
      case 'W9':
        return this.validateW9Data(extractedData);
      case 'VOIDED_CHECK':
        return this.validateBankingData(extractedData);
      case 'BANK_STATEMENTS':
        return this.validateBankStatementData(extractedData);
      case 'DRIVERS_LICENSE':
      case 'PASSPORT':
        return this.validateIDData(extractedData, documentType);
      case 'BUSINESS_LICENSE':
        return this.validateBusinessLicenseData(extractedData);
      case 'ARTICLES_OF_INCORPORATION':
        return this.validateArticlesData(extractedData);
      case 'SS4_EIN_LETTER':
        return this.validateSS4Data(extractedData);
      case 'BENEFICIAL_OWNERSHIP':
        return this.validateBeneficialOwnershipData(extractedData);
      default:
        return extractedData as ExtractedDocumentData;
    }
  }

  // Validation helpers for each document type
  private static validateW9Data(data: any): ExtractedW9Data {
    return {
      legalBusinessName: this.sanitizeString(data.legalBusinessName),
      dbaBusinessName: this.sanitizeString(data.dbaBusinessName),
      federalTaxIdNumber: this.sanitizeTaxId(data.federalTaxIdNumber),
      businessAddress: this.sanitizeString(data.businessAddress),
      city: this.sanitizeString(data.city),
      state: this.sanitizeState(data.state),
      zip: this.sanitizeZip(data.zip),
      signerName: this.sanitizeString(data.signerName),
      signerSSN: this.sanitizeSSN(data.signerSSN),
      businessType: data.businessType || undefined,
      confidence: data.confidence || 0.5,
    };
  }

  private static validateBankingData(data: any): ExtractedBankingData {
    // Split account holder name into first/last
    const nameParts = this.splitName(data.accountHolderName);
    
    return {
      bankName: this.sanitizeString(data.bankName),
      routingNumber: this.sanitizeRoutingNumber(data.routingNumber),
      accountNumber: this.sanitizeAccountNumber(data.accountNumber),
      accountHolderName: this.sanitizeString(data.accountHolderName),
      accountHolderFirstName: this.sanitizeString(data.accountHolderFirstName || nameParts.first),
      accountHolderLastName: this.sanitizeString(data.accountHolderLastName || nameParts.last),
      address: this.sanitizeString(data.address),
      city: this.sanitizeString(data.city),
      state: this.sanitizeState(data.state),
      zip: this.sanitizeZip(data.zip),
      confidence: data.confidence || 0.5,
    };
  }

  private static validateBankStatementData(data: any): ExtractedBankStatementData {
    return {
      bankName: this.sanitizeString(data.bankName),
      accountNumber: this.sanitizeAccountNumber(data.accountNumber),
      accountHolderName: this.sanitizeString(data.accountHolderName),
      statementPeriod: this.sanitizeString(data.statementPeriod),
      startDate: this.sanitizeDate(data.startDate),
      endDate: this.sanitizeDate(data.endDate),
      totalDeposits: this.sanitizeNumber(data.totalDeposits),
      transactionCount: this.sanitizeInteger(data.transactionCount),
      largestTransaction: this.sanitizeNumber(data.largestTransaction),
      averageTransaction: this.sanitizeNumber(data.averageTransaction),
      monthlySalesVolume: this.sanitizeNumber(data.monthlySalesVolume || data.totalDeposits),
      confidence: data.confidence || 0.5,
    };
  }

  private static validateIDData(data: any, idType: string): ExtractedIDData {
    const nameParts = this.splitName(data.fullName);
    
    return {
      fullName: this.sanitizeString(data.fullName),
      firstName: this.sanitizeString(data.firstName || nameParts.first),
      lastName: this.sanitizeString(data.lastName || nameParts.last),
      dob: this.sanitizeDate(data.dob),
      address: this.sanitizeString(data.address),
      city: this.sanitizeString(data.city),
      state: this.sanitizeState(data.state),
      zip: this.sanitizeZip(data.zip),
      licenseNumber: this.sanitizeString(data.licenseNumber),
      expirationDate: this.sanitizeDate(data.expirationDate),
      issueDate: this.sanitizeDate(data.issueDate),
      issuingState: this.sanitizeState(data.issuingState || data.state),
      idType: (idType === 'PASSPORT' ? 'PASSPORT' : 'DRIVERS_LICENSE') as 'DRIVERS_LICENSE' | 'PASSPORT' | 'STATE_ID',
      confidence: data.confidence || 0.5,
    };
  }

  private static validateBusinessLicenseData(data: any): ExtractedBusinessLicenseData {
    return {
      legalBusinessName: this.sanitizeString(data.legalBusinessName),
      dbaBusinessName: this.sanitizeString(data.dbaBusinessName),
      businessAddress: this.sanitizeString(data.businessAddress),
      locationAddress: this.sanitizeString(data.locationAddress || data.businessAddress),
      city: this.sanitizeString(data.city),
      state: this.sanitizeState(data.state),
      zip: this.sanitizeZip(data.zip),
      licenseNumber: this.sanitizeString(data.licenseNumber),
      licenseType: this.sanitizeString(data.licenseType),
      issueDate: this.sanitizeDate(data.issueDate),
      expirationDate: this.sanitizeDate(data.expirationDate),
      businessType: this.sanitizeString(data.businessType),
      confidence: data.confidence || 0.5,
    };
  }

  private static validateArticlesData(data: any): ExtractedArticlesOfIncorporationData {
    return {
      legalBusinessName: this.sanitizeString(data.legalBusinessName),
      incorporationState: this.sanitizeState(data.incorporationState),
      incorporationDate: this.sanitizeDate(data.incorporationDate),
      entityStartDate: this.sanitizeDate(data.entityStartDate || data.incorporationDate),
      ownershipType: data.ownershipType || undefined,
      registeredAgentName: this.sanitizeString(data.registeredAgentName),
      registeredAgentAddress: this.sanitizeString(data.registeredAgentAddress),
      registeredAgentCity: this.sanitizeString(data.registeredAgentCity),
      registeredAgentState: this.sanitizeState(data.registeredAgentState),
      registeredAgentZip: this.sanitizeZip(data.registeredAgentZip),
      confidence: data.confidence || 0.5,
    };
  }

  private static validateSS4Data(data: any): ExtractedSS4EINLetterData {
    return {
      einNumber: this.sanitizeTaxId(data.einNumber),
      legalBusinessName: this.sanitizeString(data.legalBusinessName),
      businessAddress: this.sanitizeString(data.businessAddress),
      city: this.sanitizeString(data.city),
      state: this.sanitizeState(data.state),
      zip: this.sanitizeZip(data.zip),
      confidence: data.confidence || 0.5,
    };
  }

  private static validateBeneficialOwnershipData(data: any): ExtractedBeneficialOwnershipData {
    const owners = Array.isArray(data.owners) ? data.owners.map((owner: any) => {
      const nameParts = this.splitName(owner.fullName);
      return {
        fullName: this.sanitizeString(owner.fullName),
        firstName: this.sanitizeString(owner.firstName || nameParts.first),
        lastName: this.sanitizeString(owner.lastName || nameParts.last),
        ownershipPercentage: this.sanitizeNumber(owner.ownershipPercentage),
        ssn: this.sanitizeSSN(owner.ssn),
        dob: this.sanitizeDate(owner.dob),
        address: this.sanitizeString(owner.address),
        city: this.sanitizeString(owner.city),
        state: this.sanitizeState(owner.state),
        zip: this.sanitizeZip(owner.zip),
        title: this.sanitizeString(owner.title),
      };
    }) : [];

    return {
      owners,
      confidence: data.confidence || 0.5,
    };
  }

  // Utility sanitization functions
  private static sanitizeString(value: any): string | undefined {
    if (!value || typeof value !== 'string') return undefined;
    return value.trim() || undefined;
  }

  private static sanitizeNumber(value: any): number | undefined {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      // Remove currency symbols and commas
      const cleaned = value.replace(/[$,\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  }

  private static sanitizeInteger(value: any): number | undefined {
    const num = this.sanitizeNumber(value);
    return num !== undefined ? Math.floor(num) : undefined;
  }

  private static sanitizeDate(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') {
      // Try to parse common date formats
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }
    return undefined;
  }

  private static sanitizeSSN(value: any): string | undefined {
    if (!value) return undefined;
    const cleaned = String(value).replace(/\D/g, '');
    if (cleaned.length === 9) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
    }
    return undefined;
  }

  private static sanitizeTaxId(value: any): string | undefined {
    if (!value) return undefined;
    // Handle EIN format: XX-XXXXXXX
    const cleaned = String(value).replace(/\D/g, '');
    if (cleaned.length === 9) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    }
    return undefined;
  }

  private static sanitizeRoutingNumber(value: any): string | undefined {
    if (!value) return undefined;
    const cleaned = String(value).replace(/\D/g, '');
    return cleaned.length === 9 ? cleaned : undefined;
  }

  private static sanitizeAccountNumber(value: any): string | undefined {
    if (!value) return undefined;
    return String(value).trim() || undefined;
  }

  private static sanitizeState(value: any): string | undefined {
    if (!value) return undefined;
    const state = String(value).trim().toUpperCase();
    // Validate US state codes (2 letters)
    if (state.length === 2 && /^[A-Z]{2}$/.test(state)) {
      return state;
    }
    return undefined;
  }

  private static sanitizeZip(value: any): string | undefined {
    if (!value) return undefined;
    const cleaned = String(value).replace(/\D/g, '');
    if (cleaned.length === 5 || cleaned.length === 9) {
      return cleaned;
    }
    return undefined;
  }

  private static splitName(fullName: string | undefined): { first: string | undefined; last: string | undefined } {
    if (!fullName) return { first: undefined, last: undefined };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first: parts[0], last: undefined };
    }
    return {
      first: parts[0],
      last: parts.slice(1).join(' '),
    };
  }

  /**
   * Generate SHA-256 hash of document for tracking/duplication detection
   */
  private static generateDocumentHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Securely clear buffer from memory (zero out)
   */
  private static clearBuffer(buffer: Buffer): void {
    try {
      buffer.fill(0); // Zero out the buffer
    } catch (error) {
      // Ignore errors (buffer might be read-only)
    }
  }
}

