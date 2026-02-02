import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { env } from "./env";
import { generalLimiter } from "./middleware/rateLimiting";
import { errorHandler, notFoundHandler, setupGracefulShutdown } from "./middleware/errorHandler";
import helmet from "helmet";
import cors from "cors";

const app = express();

// Trust proxy for accurate IP addresses (required for rate limiting)
app.set("trust proxy", 1);

// Enhanced security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: env.NODE_ENV === "development" 
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://replit.com"] 
        : ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:", env.CLOUDFLARE_R2_PUBLIC_URL || ""].filter(Boolean),
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: env.NODE_ENV === 'production' 
    ? [env.APP_URL!] 
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Apply general rate limiting to all API routes
app.use("/api", generalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Error handling middleware (must be after ALL routes including static/vite)
    app.use(notFoundHandler);
    app.use(errorHandler);

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Listen on 0.0.0.0 so the app is reachable from Fly proxy (required for Fly.io)
    const port = env.PORT;
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });

    // Setup graceful shutdown handling
    setupGracefulShutdown(server);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
