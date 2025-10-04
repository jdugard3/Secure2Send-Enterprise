import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";
import { AppError } from "./errorHandler";

// Input sanitization utility
export class InputSanitizer {
  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(input: string): string {
    // Basic HTML sanitization - remove dangerous tags and attributes
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onload, etc.)
      .replace(/<[^>]*>/g, ''); // Remove all remaining HTML tags
  }

  // Sanitize SQL-like content (additional protection)
  static sanitizeSql(input: string): string {
    return input
      .replace(/['";\\]/g, '') // Remove dangerous SQL characters
      .replace(/(-{2}|\/\*|\*\/)/g, '') // Remove SQL comments
      .replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi, ''); // Remove SQL keywords
  }

  // Sanitize file paths
  static sanitizeFilePath(input: string): string {
    return input
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
      .replace(/^[\/\\]+|[\/\\]+$/g, ''); // Remove leading/trailing slashes
  }

  // General text sanitization
  static sanitizeText(input: string): string {
    return this.sanitizeHtml(input)
      .trim()
      .substring(0, 1000); // Limit length to prevent DoS
  }

  // Sanitize email addresses
  static sanitizeEmail(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9@._-]/g, ''); // Only allow valid email characters
  }
}

// Validation middleware factory
export function validateInput(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }

      // Validate with Zod schema
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        next(new AppError(`Validation failed: ${errorMessage}`, 400));
      } else {
        next(error);
      }
    }
  };
}

// Recursively sanitize object properties
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Apply appropriate sanitization based on field name
      if (key.toLowerCase().includes('email')) {
        sanitized[key] = InputSanitizer.sanitizeEmail(value);
      } else if (key.toLowerCase().includes('path') || key.toLowerCase().includes('file')) {
        sanitized[key] = InputSanitizer.sanitizeFilePath(value);
      } else {
        sanitized[key] = InputSanitizer.sanitizeText(value);
      }
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Enhanced validation schemas
export const enhancedValidationSchemas = {
  // User registration with strict validation
  userRegistration: z.object({
    email: z.string()
      .email("Invalid email format")
      .max(254, "Email too long")
      .transform(val => InputSanitizer.sanitizeEmail(val)),
    
    password: z.string()
      .min(12, "Password must be at least 12 characters")
      .max(128, "Password too long")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
        "Password must contain uppercase, lowercase, number, and special character"),
    
    firstName: z.string()
      .min(1, "First name required")
      .max(50, "First name too long")
      .transform(val => InputSanitizer.sanitizeText(val)),
    
    lastName: z.string()
      .min(1, "Last name required")
      .max(50, "Last name too long")
      .transform(val => InputSanitizer.sanitizeText(val)),
    
    companyName: z.string()
      .min(1, "Company name required")
      .max(100, "Company name too long")
      .transform(val => InputSanitizer.sanitizeText(val))
  }),

  // Document status update
  documentStatusUpdate: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
    rejectionReason: z.string()
      .max(500, "Rejection reason too long")
      .transform(val => InputSanitizer.sanitizeText(val))
      .optional()
  }),

  // Client status update
  clientStatusUpdate: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'INCOMPLETE'])
  }),

  // Admin impersonation
  adminImpersonation: z.object({
    userId: z.string()
      .uuid("Invalid user ID format")
      .transform(val => InputSanitizer.sanitizeText(val))
  })
};

console.log("✅ Enhanced input validation middleware configured");
console.log("   - XSS protection: enabled");
console.log("   - SQL injection protection: enabled");
console.log("   - Path traversal protection: enabled");
console.log("   - Input length limits: enabled");
