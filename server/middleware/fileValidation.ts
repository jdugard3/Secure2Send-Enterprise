import multer from "multer";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import { DOCUMENT_TYPES } from "@/lib/constants";

// Enhanced file validation utilities
export class FileValidator {
  
  // Check file signature (magic numbers) to validate actual file type
  static validateFileSignature(buffer: Buffer, mimeType: string): boolean {
    const signatures: { [key: string]: Buffer[] } = {
      'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
      'image/jpeg': [
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JFIF
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]), // EXIF
        Buffer.from([0xFF, 0xD8, 0xFF, 0xDB])  // Standard JPEG
      ],
      'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])], // PNG
    };

    const expectedSignatures = signatures[mimeType];
    if (!expectedSignatures) return false;

    return expectedSignatures.some(signature => 
      buffer.subarray(0, signature.length).equals(signature)
    );
  }

  // Sanitize filename to prevent path traversal
  static sanitizeFilename(filename: string): string {
    // Remove any path separators and dangerous characters
    const sanitized = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric chars except . and -
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 255); // Limit length

    // Ensure we have a filename
    if (!sanitized || sanitized.length === 0) {
      return `file_${Date.now()}`;
    }

    return sanitized;
  }

  // Generate secure filename with hash
  static generateSecureFilename(originalName: string, buffer: Buffer): string {
    const hash = createHash('sha256').update(buffer).digest('hex').substring(0, 16);
    const ext = path.extname(originalName).toLowerCase();
    return `${hash}_${Date.now()}${ext}`;
  }

  // Validate document type constraints
  static validateDocumentConstraints(documentType: string, fileSize: number, mimeType: string): { valid: boolean; error?: string } {
    const docType = DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES];
    
    if (!docType) {
      return { valid: false, error: "Invalid document type" };
    }

    // Check file size (convert MB to bytes)
    const maxSizeBytes = docType.maxSize * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      return { 
        valid: false, 
        error: `File size exceeds maximum allowed size of ${docType.maxSize}MB` 
      };
    }

    // Check MIME type
    if (!docType.acceptedTypes.includes(mimeType)) {
      return { 
        valid: false, 
        error: `File type ${mimeType} not allowed for ${docType.name}. Allowed types: ${docType.acceptedTypes.join(', ')}` 
      };
    }

    return { valid: true };
  }

  // Comprehensive file validation
  static async validateFile(file: Express.Multer.File, documentType: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Read file buffer for signature validation
      const buffer = await fs.promises.readFile(file.path);
      
      // 1. Validate file signature matches MIME type
      if (!this.validateFileSignature(buffer, file.mimetype)) {
        return { 
          valid: false, 
          error: `File content does not match declared type ${file.mimetype}` 
        };
      }

      // 2. Validate document type constraints
      const constraintValidation = this.validateDocumentConstraints(documentType, file.size, file.mimetype);
      if (!constraintValidation.valid) {
        return constraintValidation;
      }

      // 3. Additional security checks
      if (buffer.length === 0) {
        return { valid: false, error: "File is empty" };
      }

      // 4. Check for suspicious content (basic scan)
      const suspiciousPatterns = [
        /javascript:/gi,
        /<script/gi,
        /eval\(/gi,
        /document\.cookie/gi,
      ];

      const fileContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length)); // Check first 1KB
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(fileContent)) {
          return { valid: false, error: "File contains suspicious content" };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error("File validation error:", error);
      return { valid: false, error: "File validation failed" };
    }
  }
}

// Enhanced multer configuration with better security
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const secureUpload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max (will be further restricted per document type)
    files: 1, // Only allow single file upload
  },
  fileFilter: (req, file, cb) => {
    // Basic MIME type validation (signature validation happens later)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF, JPG, and PNG files are allowed.`));
    }
  },
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      // Generate secure filename
      const secureFilename = FileValidator.sanitizeFilename(file.originalname);
      const timestamp = Date.now();
      const ext = path.extname(secureFilename).toLowerCase();
      const name = path.basename(secureFilename, ext);
      cb(null, `${name}_${timestamp}${ext}`);
    }
  })
});

console.log("✅ Enhanced file upload security configured");
console.log(`   - Upload directory: ${uploadDir}`);
console.log(`   - Max file size: 50MB`);
console.log(`   - File signature validation: enabled`);
console.log(`   - Filename sanitization: enabled`);
console.log(`   - Content scanning: basic patterns`);
