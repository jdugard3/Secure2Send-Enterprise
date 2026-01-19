import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../env";

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === "production" ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in development for localhost
    if (env.NODE_ENV === "development" && req.ip === "127.0.0.1") {
      return true;
    }
    return false;
  },
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === "production" ? 5 : 50, // Limit each IP to 5 login attempts per 15 minutes in production
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: (req) => {
    if (env.NODE_ENV === "development" && req.ip === "127.0.0.1") {
      return true;
    }
    return false;
  },
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: env.NODE_ENV === "production" ? 20 : 100, // Limit each IP to 20 uploads per hour in production
  message: {
    error: "Too many file uploads, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (env.NODE_ENV === "development" && req.ip === "127.0.0.1") {
      return true;
    }
    return false;
  },
});

// Admin operations rate limiter (more lenient for admin users)
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === "production" ? 200 : 1000, // Higher limit for admin operations
  message: {
    error: "Too many admin requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (env.NODE_ENV === "development" && req.ip === "127.0.0.1") {
      return true;
    }
    return false;
  },
});

// Password reset rate limiter (more lenient than auth limiter)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: env.NODE_ENV === "production" ? 10 : 50, // 10 attempts per hour in production
  message: {
    error: "Too many password reset attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful resets
  skip: (req) => {
    if (env.NODE_ENV === "development" && req.ip === "127.0.0.1") {
      return true;
    }
    return false;
  },
});

// OCR processing rate limiter (per user, not per IP)
export const ocrLimiter = rateLimit({
  windowMs: (typeof env.OCR_RATE_LIMIT_WINDOW_MS === 'number' ? env.OCR_RATE_LIMIT_WINDOW_MS : 15 * 60 * 1000), // 15 minutes default
  max: (typeof env.OCR_RATE_LIMIT_MAX === 'number' ? env.OCR_RATE_LIMIT_MAX : 10), // 10 requests per window default
  message: {
    error: "Too many OCR processing requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    // Rate limit per user ID if authenticated, otherwise per IP (with IPv6 support)
    if (req.user?.id) {
      return req.user.id;
    }
    // Use ipKeyGenerator helper for proper IPv6 handling
    return ipKeyGenerator(req) || 'unknown';
  },
  skip: (req) => {
    if (env.NODE_ENV === "development" && req.ip === "127.0.0.1") {
      return true;
    }
    return false;
  },
});

// Export rate limiting info for logging
export const rateLimitConfig = {
  general: { windowMs: 15, max: env.NODE_ENV === "production" ? 100 : 1000 },
  auth: { windowMs: 15, max: env.NODE_ENV === "production" ? 5 : 50 },
  passwordReset: { windowMs: 60, max: env.NODE_ENV === "production" ? 10 : 50 },
  upload: { windowMs: 60, max: env.NODE_ENV === "production" ? 20 : 100 },
  admin: { windowMs: 15, max: env.NODE_ENV === "production" ? 200 : 1000 },
  ocr: { 
    windowMs: (typeof env.OCR_RATE_LIMIT_WINDOW_MS === 'number' ? env.OCR_RATE_LIMIT_WINDOW_MS / 60000 : 15), 
    max: (typeof env.OCR_RATE_LIMIT_MAX === 'number' ? env.OCR_RATE_LIMIT_MAX : 10) 
  },
};

console.log("✅ Rate limiting configured:");
console.log(`   - Environment: ${env.NODE_ENV}`);
console.log(`   - General API: ${rateLimitConfig.general.max} requests per ${rateLimitConfig.general.windowMs}min`);
console.log(`   - Authentication: ${rateLimitConfig.auth.max} attempts per ${rateLimitConfig.auth.windowMs}min`);
console.log(`   - Password Reset: ${rateLimitConfig.passwordReset.max} attempts per ${rateLimitConfig.passwordReset.windowMs}min`);
console.log(`   - File uploads: ${rateLimitConfig.upload.max} uploads per ${rateLimitConfig.upload.windowMs}min`);
console.log(`   - Admin operations: ${rateLimitConfig.admin.max} requests per ${rateLimitConfig.admin.windowMs}min`);
console.log(`   - OCR processing: ${rateLimitConfig.ocr.max} requests per ${rateLimitConfig.ocr.windowMs}min per user`);
