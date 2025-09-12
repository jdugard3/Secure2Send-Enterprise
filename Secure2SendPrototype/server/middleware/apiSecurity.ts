import { Request, Response, NextFunction } from "express";
import { randomBytes, createHash } from "crypto";
import rateLimit from "express-rate-limit";
import { AppError } from "./errorHandler";
import { AuditService } from "../services/auditService";
import { SecurityMonitoringService } from "../services/securityMonitoring";

// API Key management for external integrations
export class ApiKeyManager {
  private static apiKeys = new Map<string, {
    name: string;
    permissions: string[];
    createdAt: Date;
    lastUsed?: Date;
    isActive: boolean;
  }>();

  static generateApiKey(name: string, permissions: string[] = []): string {
    const key = 'sk_' + randomBytes(32).toString('hex');
    this.apiKeys.set(key, {
      name,
      permissions,
      createdAt: new Date(),
      isActive: true
    });
    return key;
  }

  static validateApiKey(key: string): boolean {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey || !apiKey.isActive) {
      return false;
    }
    
    apiKey.lastUsed = new Date();
    return true;
  }

  static revokeApiKey(key: string): boolean {
    const apiKey = this.apiKeys.get(key);
    if (apiKey) {
      apiKey.isActive = false;
      return true;
    }
    return false;
  }
}

// Request signing for sensitive operations
export class RequestSigner {
  static generateNonce(): string {
    return randomBytes(16).toString('hex');
  }

  static signRequest(method: string, path: string, body: string, timestamp: number, nonce: string, secret: string): string {
    const message = `${method}|${path}|${body}|${timestamp}|${nonce}`;
    return createHash('sha256').update(message + secret).digest('hex');
  }

  static verifySignature(req: Request, secret: string, maxAge: number = 300): boolean {
    const signature = req.headers['x-signature'] as string;
    const timestamp = parseInt(req.headers['x-timestamp'] as string);
    const nonce = req.headers['x-nonce'] as string;

    if (!signature || !timestamp || !nonce) {
      return false;
    }

    // Check timestamp (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > maxAge) {
      return false;
    }

    // Verify signature
    const body = JSON.stringify(req.body) || '';
    const expectedSignature = this.signRequest(req.method, req.path, body, timestamp, nonce, secret);
    
    return signature === expectedSignature;
  }
}

// Advanced rate limiting with different strategies
export const createAdvancedRateLimit = (options: {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request) => void;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: options.keyGenerator || ((req) => req.ip || 'unknown'),
    handler: (req, res) => {
      if (options.onLimitReached) {
        options.onLimitReached(req);
      }
      
      // Log rate limit violation
      console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
      
      res.status(429).json({
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// IP whitelist/blacklist middleware
export class IPFilterMiddleware {
  private static whitelist = new Set<string>();
  private static blacklist = new Set<string>();

  static addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
  }

  static addToBlacklist(ip: string): void {
    this.blacklist.add(ip);
  }

  static removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
  }

  static removeFromBlacklist(ip: string): void {
    this.blacklist.delete(ip);
  }

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || 'unknown';

      // Check blacklist first
      if (this.blacklist.has(clientIP)) {
        console.warn(`Blocked request from blacklisted IP: ${clientIP}`);
        return res.status(403).json({
          error: "Forbidden",
          message: "Access denied"
        });
      }

      // If whitelist is not empty, check if IP is whitelisted
      if (this.whitelist.size > 0 && !this.whitelist.has(clientIP)) {
        console.warn(`Blocked request from non-whitelisted IP: ${clientIP}`);
        return res.status(403).json({
          error: "Forbidden", 
          message: "Access denied"
        });
      }

      next();
    };
  }
}

// Request size limiting middleware
export const requestSizeLimit = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: "Payload Too Large",
        message: `Request size exceeds maximum allowed size of ${maxSize} bytes`
      });
    }
    
    next();
  };
};

// Security headers middleware (enhanced)
export const enhancedSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Add custom security headers
  res.setHeader('X-Request-ID', randomBytes(16).toString('hex'));
  res.setHeader('X-Response-Time', Date.now().toString());
  
  next();
};

// Request logging and monitoring middleware
export const securityLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = randomBytes(8).toString('hex');
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  
  // Log request details
  console.log(`[${requestId}] ${req.method} ${req.path} from ${req.ip}`);
  
  // Monitor for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
  ];
  
  const fullUrl = req.originalUrl || req.url;
  const body = JSON.stringify(req.body);
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl) || pattern.test(body)) {
      console.warn(`[${requestId}] Suspicious request detected: ${pattern.source}`);
      
      // Log to audit system
      if ((req as any).user) {
        AuditService.logAction((req as any).user, 'SUSPICIOUS_REQUEST', req, {
          resourceType: 'security',
          metadata: {
            pattern: pattern.source,
            url: fullUrl,
            body: body.substring(0, 500) // Limit body size in logs
          }
        });
      }
      break;
    }
  }
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Response: ${res.statusCode} in ${duration}ms`);
    
    // Trigger security monitoring for failed requests
    if (res.statusCode >= 400 && (req as any).user) {
      SecurityMonitoringService.checkFailedLoginAttempts(req.ip || 'unknown', (req as any).user.id);
    }
  });
  
  next();
};

// CORS preflight optimization
export const optimizedCorsHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    // Handle preflight requests efficiently
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache for 24 hours
    res.status(204).end();
    return;
  }
  next();
};

// Content validation middleware
export const contentValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Content-Type header is required"
      });
    }
    
    // Allow only specific content types
    const allowedTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded'
    ];
    
    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    
    if (!isAllowed) {
      return res.status(415).json({
        error: "Unsupported Media Type",
        message: "Content-Type not supported"
      });
    }
  }
  
  next();
};

console.log("✅ Enhanced API security middleware configured");
console.log("   - API key management: enabled");
console.log("   - Request signing: enabled");
console.log("   - Advanced rate limiting: enabled");
console.log("   - IP filtering: enabled");
console.log("   - Security monitoring: enabled");
