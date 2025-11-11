import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { pool } from "./db";
import { env } from "./env";
import { authLimiter } from "./middleware/rateLimiting";
import { EmailService } from "./services/emailService";
import { AuditService } from "./services/auditService";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      password: string;
      firstName: string | null;
      lastName: string | null;
      companyName: string | null;
      role: 'ADMIN' | 'CLIENT' | null;
      emailVerified: boolean | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express) {
  // Session setup
  const PostgresSessionStore = connectPg(session);
  const sessionStore = new PostgresSessionStore({
    pool,
    createTableIfMissing: true,
    tableName: "sessions",
  });

  const sessionSettings: session.SessionOptions = {
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: env.NODE_ENV === "production", // Secure cookies in production
      httpOnly: true,
      maxAge: 30 * 60 * 1000, // 30 minutes of inactivity before timeout
      sameSite: env.NODE_ENV === "production" ? "strict" : "lax", // CSRF protection
    },
    rolling: true, // Reset the cookie maxAge on every response (keeps session alive with activity)
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes with rate limiting
  app.post("/api/register", authLimiter, async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, companyName, invitationCode } = req.body;

      // REQUIRE invitation code for signup
      if (!invitationCode || invitationCode.trim().length === 0) {
        return res.status(400).json({ message: "Invitation code is required to sign up" });
      }

      // Validate invitation code
      const invitation = await storage.getInvitationCodeByCode(invitationCode.trim().toUpperCase());
      if (!invitation) {
        return res.status(400).json({ message: "Invalid invitation code" });
      }

      if (invitation.status === 'USED') {
        return res.status(400).json({ message: "This invitation code has already been used" });
      }

      if (invitation.status === 'EXPIRED') {
        return res.status(400).json({ message: "This invitation code has expired" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        companyName,
        role: "CLIENT",
        mfaRequired: true, // Explicitly require MFA for new users
      });

      // Debug logging for new user MFA status
      console.log('🆕 New User Created - MFA Status:', {
        userId: user.id,
        email: user.email,
        mfaEnabled: user.mfaEnabled,
        mfaRequired: user.mfaRequired,
        createdAt: user.createdAt
      });

      // Mark invitation code as used
      await storage.markInvitationCodeAsUsed(invitation.code, user.id);
      console.log(`✅ Invitation code ${invitation.code} marked as used by ${user.email}`);

      // Audit log the invitation code usage
      await AuditService.logAction(user, 'INVITATION_CODE_USED', req, {
        resourceType: 'invitation_code',
        resourceId: invitation.id,
        metadata: { 
          code: invitation.code, 
          label: invitation.label,
          createdBy: invitation.createdBy 
        }
      });

      // Also create a client record for this user
      await storage.createClient({
        userId: user.id,
        status: "PENDING",
      });

      // Note: IRIS CRM lead will be created when user creates their first merchant application
      // This ensures each merchant application has its own lead in IRIS

      // Send welcome email to user (async, don't block registration)
      EmailService.sendWelcomeEmail(user).catch(error => {
        console.error('Failed to send welcome email:', error);
      });

      // Send new user notification to admins (async, don't block registration)
      EmailService.sendNewUserNotificationEmail(user).catch(error => {
        console.error('Failed to send new user notification email:', error);
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password in response
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", async (err: any, user: User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      // Debug logging for MFA status
      console.log('🔍 Login Debug - User MFA Status:', {
        userId: user.id,
        email: user.email,
        mfaEnabled: user.mfaEnabled,
        mfaEmailEnabled: user.mfaEmailEnabled,
        mfaRequired: user.mfaRequired,
        createdAt: user.createdAt
      });

      // Check if user has MFA enabled
      if (user.mfaEnabled || user.mfaEmailEnabled) {
        // Don't log the user in yet, return MFA challenge
        const { password: _, ...userWithoutPassword } = user;
        
        const mfaResponse = {
          mfaRequired: true,
          userId: user.id,
          email: user.email,
          message: "MFA verification required",
          // Include available MFA methods so frontend knows which tabs to show
          mfaTotp: user.mfaEnabled || false,
          mfaEmail: user.mfaEmailEnabled || false
        };
        
        console.log('🔐 Returning MFA challenge for user:', user.email, 'with methods:', mfaResponse);
        return res.json(mfaResponse);
      }

      // Check if user needs to set up MFA (new users)
      if (user.mfaRequired && !user.mfaEnabled) {
        console.log('⚠️ User needs MFA setup:', user.email);
        // Log the user in but indicate MFA setup is required
        req.login(user, (err) => {
          if (err) return next(err);
          const { password: _, ...userWithoutPassword } = user;
          return res.json({
            ...userWithoutPassword,
            mfaSetupRequired: true,
            message: "MFA setup required for account security"
          });
        });
        return;
      }

      // No MFA required, proceed with normal login
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password in response
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // MFA login completion route
  app.post("/api/login/mfa", authLimiter, async (req, res, next) => {
    try {
      const { userId, code } = req.body;
      
      if (!userId || !code) {
        return res.status(400).json({ message: "User ID and MFA code are required" });
      }

      // Import MFA service
      const { MfaService } = await import('./services/mfaService');
      
      // Verify the MFA code
      const mfaResult = await MfaService.verifyMfaForLogin(userId, code);
      
      if (!mfaResult.success) {
        return res.status(401).json({ message: mfaResult.error || "Invalid MFA code" });
      }

      // Get the user and log them in
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password in response
        const { password: _, ...userWithoutPassword } = user;
        res.json({
          ...userWithoutPassword,
          mfaVerified: true,
          usedBackupCode: mfaResult.isBackupCode
        });
      });
    } catch (error) {
      console.error("MFA login error:", error);
      res.status(500).json({ message: "MFA login failed" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      // Destroy the session completely
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destruction error:", sessionErr);
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/auth/user", async (req: any, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Don't send password in response
    const { password: _, ...userWithoutPassword } = req.user;
    
    // If impersonating, include the impersonated user data
    if (req.session.isImpersonating && req.session.impersonatedUserId) {
      try {
        const { storage } = await import("./storage");
        const impersonatedUser = await storage.getUser(req.session.impersonatedUserId);
        if (impersonatedUser) {
          const { password: __, ...impersonatedUserWithoutPassword } = impersonatedUser;
          return res.json({
            ...userWithoutPassword,
            isImpersonating: true,
            impersonatedUser: impersonatedUserWithoutPassword
          });
        }
      } catch (error) {
        console.error("Error fetching impersonated user:", error);
      }
    }
    
    res.json({
      ...userWithoutPassword,
      isImpersonating: false
    });
  });
}

export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};