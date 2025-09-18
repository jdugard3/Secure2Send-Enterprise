import { z } from "zod";
import { config } from "dotenv";

// Load environment variables from .env file
config();

// Environment validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  
  // Server
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().regex(/^\d+$/).transform(Number).default("5000"),
  
  // Session & Security
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters for security"),
  
  // Email Configuration
  EMAIL_PROVIDER: z.enum(["resend", "mailgun", "console"]).optional().default("console"),
  RESEND_API_KEY: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  APP_URL: z.string().url().optional().default("http://localhost:3000"),
  
  // Replit-specific (optional in production)
  REPL_ID: z.string().optional(),
  REPLIT_DOMAINS: z.string().optional(),
  ISSUER_URL: z.string().url().optional(),
  
  // Cloudflare R2 Configuration
  CLOUDFLARE_R2_ENDPOINT: z.string().url().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().url().optional(),
  
  // IRIS CRM Integration
  IRIS_CRM_API_KEY: z.string().optional(),
  IRIS_CRM_SUBDOMAIN: z.string().optional(),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    
    // Additional validation for production
    if (env.NODE_ENV === "production") {
      // Ensure critical production variables are set
      if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
        throw new Error("SESSION_SECRET must be set and at least 32 characters in production");
      }
      
      // Warn about development defaults
      if (env.SESSION_SECRET === "fallback-secret-key-for-development") {
        throw new Error("Cannot use development SESSION_SECRET in production");
      }
    }
    
    return env;
  } catch (error) {
    console.error("❌ Environment validation failed:");
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
    } else {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }
}

// Export validated environment variables
export const env = validateEnv();

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;

// Log environment status (without sensitive values)
console.log("✅ Environment validation passed");
console.log(`   - NODE_ENV: ${env.NODE_ENV}`);
console.log(`   - PORT: ${env.PORT}`);
console.log(`   - DATABASE_URL: ${env.DATABASE_URL ? "✓ Set" : "✗ Missing"}`);
console.log(`   - SESSION_SECRET: ${env.SESSION_SECRET ? "✓ Set" : "✗ Missing"}`);
console.log(`   - EMAIL_PROVIDER: ${env.EMAIL_PROVIDER}`);
console.log(`   - RESEND_API_KEY: ${env.RESEND_API_KEY ? "✓ Set" : "✗ Missing"}`);
console.log(`   - MAILGUN_API_KEY: ${env.MAILGUN_API_KEY ? "✓ Set" : "✗ Missing"}`);
console.log(`   - MAILGUN_DOMAIN: ${env.MAILGUN_DOMAIN || "✗ Missing"}`);
console.log(`   - APP_URL: ${env.APP_URL}`);
console.log(`   - IRIS_CRM_API_KEY: ${env.IRIS_CRM_API_KEY ? "✓ Set" : "✗ Missing"}`);
console.log(`   - IRIS_CRM_SUBDOMAIN: ${env.IRIS_CRM_SUBDOMAIN || "✗ Missing"}`);
