import { Request, Response, NextFunction } from "express";
import { env } from "../env";

// Custom error class for application-specific errors
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error types for consistent error handling
export const ErrorTypes = {
  VALIDATION_ERROR: (message: string) => new AppError(message, 400),
  UNAUTHORIZED: (message: string = "Unauthorized") => new AppError(message, 401),
  FORBIDDEN: (message: string = "Forbidden") => new AppError(message, 403),
  NOT_FOUND: (message: string = "Resource not found") => new AppError(message, 404),
  CONFLICT: (message: string = "Resource conflict") => new AppError(message, 409),
  RATE_LIMIT: (message: string = "Rate limit exceeded") => new AppError(message, 429),
  INTERNAL_ERROR: (message: string = "Internal server error") => new AppError(message, 500),
};

// Log error details (in production, this would go to a logging service)
function logError(error: Error, req: Request) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    error: {
      name: error.name,
      message: error.message,
      stack: env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  };

  console.error('🚨 Application Error:', JSON.stringify(errorInfo, null, 2));

  // In production, you would send this to a logging service like:
  // - Sentry
  // - Winston + CloudWatch
  // - Datadog
  // - LogRocket
}

// Determine if error details should be sent to client
function isOperationalError(error: any): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

// Format error response for client
function formatErrorResponse(error: any, req: Request) {
  const isDevelopment = env.NODE_ENV === 'development';
  
  // Default error response
  let response = {
    error: "Internal Server Error",
    message: "Something went wrong",
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Add more details for operational errors or development
  if (isOperationalError(error) || isDevelopment) {
    response.error = error.name || "Error";
    response.message = error.message || "An error occurred";
  }

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    (response as any).stack = error.stack;
  }

  // Add validation details for validation errors
  if (error.name === 'ZodError') {
    response.error = "Validation Error";
    response.message = "Invalid input data";
    (response as any).details = error.errors;
  }

  // Add details for multer errors (file upload)
  if (error.code === 'LIMIT_FILE_SIZE') {
    response.error = "File Too Large";
    response.message = "File size exceeds the maximum allowed limit";
  }

  return response;
}

// Main error handling middleware
export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  // Log the error
  logError(error, req);

  // Determine status code
  let statusCode = 500;
  if (error instanceof AppError) {
    statusCode = error.statusCode;
  } else if (error.status || error.statusCode) {
    statusCode = error.status || error.statusCode;
  } else if (error.name === 'ZodError') {
    statusCode = 400;
  } else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
  }

  // Format and send error response
  const errorResponse = formatErrorResponse(error, req);
  res.status(statusCode).json(errorResponse);
}

// Async error wrapper to catch promise rejections
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler for unmatched API routes only
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  // Only apply to API routes, let frontend routes pass through to Vite
  if (req.path.startsWith('/api')) {
    const error = new AppError(`Route ${req.method} ${req.path} not found`, 404);
    next(error);
  } else {
    next(); // Let Vite handle non-API routes
  }
}

// Graceful shutdown handler
export function setupGracefulShutdown(server: any) {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  
  signals.forEach(signal => {
    process.on(signal, () => {
      console.log(`📡 Received ${signal}, starting graceful shutdown...`);
      
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚫 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

console.log("✅ Error handling middleware configured");
console.log(`   - Environment: ${env.NODE_ENV}`);
console.log(`   - Detailed errors: ${env.NODE_ENV === 'development' ? 'enabled' : 'disabled'}`);
console.log(`   - Stack traces: ${env.NODE_ENV === 'development' ? 'enabled' : 'disabled'}`);
console.log(`   - Graceful shutdown: enabled`);
