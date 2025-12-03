import {
  users,
  clients,
  documents,
  merchantApplications,
  sensitiveData,
  auditLogs,
  invitationCodes,
  loginAttempts,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Document,
  type InsertDocument,
  type MerchantApplication,
  type InsertMerchantApplication,
  type ClientWithUser,
  type DocumentWithClient,
  type MerchantApplicationWithClient,
  type InvitationCode,
  type LoginAttempt,
  type InsertLoginAttempt,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { LogSanitizer, safeLog } from "./utils/logSanitizer";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;

  // Login attempt operations
  getLoginAttempt(email: string, ipAddress: string): Promise<LoginAttempt | undefined>;
  createOrUpdateLoginAttempt(email: string, ipAddress: string, userId?: string): Promise<LoginAttempt>;
  resetLoginAttempts(email: string, ipAddress: string): Promise<void>;
  isAccountLocked(email: string, ipAddress: string): Promise<boolean>;
  getRemainingAttempts(email: string, ipAddress: string): Promise<number>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  upsertUser(user: any): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  
  // Client operations
  getClientByUserId(userId: string): Promise<Client | undefined>;
  getClientById(clientId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  getAllClients(): Promise<ClientWithUser[]>;
  updateClientStatus(clientId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INCOMPLETE'): Promise<Client>;
  updateClientIrisLeadId(clientId: string, irisLeadId: string): Promise<Client>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsByClientId(clientId: string): Promise<Document[]>;
  getDocumentsByApplicationId(applicationId: string): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | undefined>;
  getAllDocumentsForReview(): Promise<DocumentWithClient[]>;
  updateDocumentStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // Merchant Application operations
  createMerchantApplication(application: InsertMerchantApplication): Promise<MerchantApplication>;
  getMerchantApplicationsByClientId(clientId: string): Promise<MerchantApplication[]>;
  getMerchantApplicationById(id: string): Promise<MerchantApplication | undefined>;
  getAllMerchantApplicationsForReview(): Promise<MerchantApplicationWithClient[]>;
  updateMerchantApplication(id: string, application: Partial<InsertMerchantApplication>): Promise<MerchantApplication>;
  updateMerchantApplicationStatus(id: string, status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<MerchantApplication>;
  updateMerchantApplicationIrisLeadId(id: string, irisLeadId: string): Promise<MerchantApplication>;
  validateMerchantApplicationOwnership(merchantApplicationId: string, userId: string): Promise<boolean>;
  deleteMerchantApplication(id: string): Promise<void>;
  
  // MFA operations
  enableUserMfa(userId: string, secret: string, backupCodes: string[]): Promise<void>;
  disableUserMfa(userId: string): Promise<void>;
  updateUserMfaLastUsed(userId: string): Promise<void>;
  updateUserMfaBackupCodes(userId: string, backupCodes: string[]): Promise<void>;
  
  // Email MFA operations
  enableEmailMfa(userId: string): Promise<void>;
  disableEmailMfa(userId: string): Promise<void>;
  saveEmailOtp(userId: string, hashedOtp: string, expiresAt: Date): Promise<void>;
  getEmailOtpData(userId: string): Promise<{ otp?: string; expiresAt?: Date; attempts: number }>;
  incrementEmailOtpAttempts(userId: string): Promise<void>;
  clearEmailOtp(userId: string): Promise<void>;
  updateEmailRateLimit(userId: string, sendCount: number, resetAt: Date): Promise<void>;
  getEmailRateLimitData(userId: string): Promise<{ sendCount: number; lastSentAt?: Date; resetAt?: Date }>;
  
  // Invitation code operations
  createInvitationCode(code: string, label: string, createdBy: string): Promise<any>;
  getInvitationCodeByCode(code: string): Promise<any | undefined>;
  getAllInvitationCodes(): Promise<any[]>;
  markInvitationCodeAsUsed(code: string, userId: string): Promise<any>;
  deleteInvitationCode(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
    return user;
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    // The token passed is the plain token, but we store hashed tokens
    // We need to check if the stored hash contains the token
    const allUsers = await db.select().from(users).where(sql`${users.passwordResetToken} IS NOT NULL`);

    // Find user whose hashed token contains the plain token
    const user = allUsers.find(u => u.passwordResetToken?.includes(token));
    return user;
  }

  // Login attempt operations
  async getLoginAttempt(email: string, ipAddress: string): Promise<LoginAttempt | undefined> {
    const [attempt] = await db.select().from(loginAttempts)
      .where(sql`lower(${loginAttempts.email}) = ${email.toLowerCase()} AND ${loginAttempts.ipAddress} = ${ipAddress}`)
      .limit(1);
    return attempt;
  }

  async createOrUpdateLoginAttempt(email: string, ipAddress: string, userId?: string): Promise<LoginAttempt> {
    const now = new Date();
    const existingAttempt = await this.getLoginAttempt(email, ipAddress);

    if (existingAttempt) {
      // Update existing attempt
      const newAttemptCount = existingAttempt.attemptCount + 1;
      let lockoutUntil: Date | undefined;

      // Lock account after 5 failed attempts for 1 hour
      if (newAttemptCount >= 5) {
        lockoutUntil = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      }

      const [updated] = await db.update(loginAttempts)
        .set({
          attemptCount: newAttemptCount,
          lastAttemptAt: now,
          lockoutUntil,
          userId: userId || existingAttempt.userId,
          updatedAt: now,
        })
        .where(eq(loginAttempts.id, existingAttempt.id))
        .returning();

      return updated;
    } else {
      // Create new attempt
      const [created] = await db.insert(loginAttempts).values({
        email: email.toLowerCase(),
        ipAddress,
        userId,
        attemptCount: 1,
        lastAttemptAt: now,
      }).returning();

      return created;
    }
  }

  async resetLoginAttempts(email: string, ipAddress: string): Promise<void> {
    await db.delete(loginAttempts)
      .where(sql`lower(${loginAttempts.email}) = ${email.toLowerCase()} AND ${loginAttempts.ipAddress} = ${ipAddress}`);
  }

  async isAccountLocked(email: string, ipAddress: string): Promise<boolean> {
    const attempt = await this.getLoginAttempt(email, ipAddress);
    if (!attempt || !attempt.lockoutUntil) {
      return false;
    }
    return new Date() < attempt.lockoutUntil;
  }

  async getRemainingAttempts(email: string, ipAddress: string): Promise<number> {
    const attempt = await this.getLoginAttempt(email, ipAddress);
    if (!attempt) {
      return 5; // Max attempts
    }

    if (attempt.lockoutUntil && new Date() < attempt.lockoutUntil) {
      return 0; // Account is locked
    }

    return Math.max(0, 5 - attempt.attemptCount);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(user: any): Promise<User> {
    const existingUser = await this.getUser(user.id);
    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();
      
      // Ensure client record exists
      const existingClient = await this.getClientByUserId(user.id);
      if (!existingClient) {
        await this.createClient({
          userId: user.id,
          status: 'PENDING',
        });
      }
      
      return updatedUser;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          password: '', // Replit auth doesn't use passwords
          role: 'CLIENT',
          emailVerified: true,
        })
        .returning();
      
      // Create client record for new user
      await this.createClient({
        userId: newUser.id,
        status: 'PENDING',
      });
      
      return newUser;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: string): Promise<void> {
    try {
      // Get client first
      const client = await this.getClientByUserId(id);
      
      if (client) {
        // IMPORTANT: Delete documents FIRST before deleting merchant applications
        // because documents have a foreign key reference to merchant_applications
        await db.delete(documents).where(eq(documents.clientId, client.id));
        
        // Now safe to delete merchant applications
        await db.delete(merchantApplications).where(eq(merchantApplications.clientId, client.id));
        
        // Delete sensitive data for this client
        await db.delete(sensitiveData).where(eq(sensitiveData.clientId, client.id));
        
        // Delete client record (this removes the foreign key reference)
        await db.delete(clients).where(eq(clients.id, client.id));
      }
      
      // Clear reviewedBy field in merchant applications where this user was the reviewer
      await db.update(merchantApplications)
        .set({ reviewedBy: null })
        .where(eq(merchantApplications.reviewedBy, id));
      
      // Delete sensitive data for this user (if any not tied to client)
      await db.delete(sensitiveData).where(eq(sensitiveData.userId, id));
      
      // Delete audit logs for this user
      await db.delete(auditLogs).where(eq(auditLogs.userId, id));
      
      // Finally delete the user
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      console.error("Error in deleteUser:", error);
      throw error;
    }
  }

  // Client operations
  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client;
  }

  async getClientById(clientId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    return client;
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(clientData).returning();
    return client;
  }

  async getAllClients(): Promise<ClientWithUser[]> {
    return await db
      .select()
      .from(clients)
      .leftJoin(users, eq(clients.userId, users.id))
      .then(rows => 
        rows
          .filter(row => row.users) // Filter out clients without users
          .map(row => ({
            ...row.clients,
            user: row.users!,
          }))
      );
  }

  async updateClientStatus(clientId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INCOMPLETE'): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ status, updatedAt: new Date() })
      .where(eq(clients.id, clientId))
      .returning();
    return client;
  }

  async updateClientIrisLeadId(clientId: string, irisLeadId: string): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ irisLeadId, updatedAt: new Date() })
      .where(eq(clients.id, clientId))
      .returning();
    return client;
  }

  // Document operations
  async createDocument(documentData: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(documentData).returning();
    return document;
  }

  async getDocumentsByClientId(clientId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.clientId, clientId))
      .orderBy(desc(documents.uploadedAt));
  }

  async getDocumentsByApplicationId(applicationId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.merchantApplicationId, applicationId))
      .orderBy(desc(documents.uploadedAt));
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getAllDocumentsForReview(): Promise<DocumentWithClient[]> {
    return await db
      .select()
      .from(documents)
      .leftJoin(clients, eq(documents.clientId, clients.id))
      .leftJoin(users, eq(clients.userId, users.id))
      .orderBy(desc(documents.uploadedAt))
      .then(rows =>
        rows
          .filter(row => row.clients && row.users) // Filter out orphaned documents
          .map(row => ({
            ...row.documents,
            client: {
              ...row.clients!,
              user: row.users!,
            },
          }))
      );
  }

  async updateDocumentStatus(
    id: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set({
        status,
        rejectionReason: rejectionReason || null,
        reviewedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Merchant Application operations
  async createMerchantApplication(application: InsertMerchantApplication): Promise<MerchantApplication> {
    // Sanitize the data before insertion, but ensure clientId is preserved
    const sanitizedData = this.sanitizeApplicationData(application);
    
    // Ensure clientId is always present (it's required)
    if (!sanitizedData.clientId && application.clientId) {
      sanitizedData.clientId = application.clientId;
    }
    
    const [merchantApplication] = await db
      .insert(merchantApplications)
      .values(sanitizedData as any) // Type assertion needed due to Partial type from sanitization
      .returning();
    return merchantApplication;
  }

  async getMerchantApplicationsByClientId(clientId: string): Promise<MerchantApplication[]> {
    return db
      .select()
      .from(merchantApplications)
      .where(eq(merchantApplications.clientId, clientId))
      .orderBy(desc(merchantApplications.createdAt));
  }

  async getMerchantApplicationById(id: string): Promise<MerchantApplication | undefined> {
    const [application] = await db
      .select()
      .from(merchantApplications)
      .where(eq(merchantApplications.id, id));
    return application;
  }

  async getAllMerchantApplicationsForReview(): Promise<MerchantApplicationWithClient[]> {
    const rows = await db
      .select()
      .from(merchantApplications)
      .leftJoin(clients, eq(merchantApplications.clientId, clients.id))
      .leftJoin(users, eq(clients.userId, users.id))
      .orderBy(desc(merchantApplications.submittedAt));

    return rows
      .filter((row) => row.clients && row.users)
      .map((row) => ({
        ...row.merchant_applications,
        client: {
          ...row.clients!,
          user: row.users!,
        },
      }));
  }

  async updateMerchantApplication(id: string, application: Partial<InsertMerchantApplication>): Promise<MerchantApplication> {
    try {
      safeLog.log("updateMerchantApplication - id:", { id });
      safeLog.log("updateMerchantApplication - application data:", application);
      
      // Sanitize the data to remove undefined values and ensure proper JSON serialization
      const sanitizedData = this.sanitizeApplicationData(application);
      safeLog.log("updateMerchantApplication - sanitized data:", sanitizedData);
      
      // Always set these timestamps manually (don't let them come from frontend)
      const updateData = {
        ...sanitizedData,
        updatedAt: new Date(),
        lastSavedAt: new Date(),
      };
      
      safeLog.log("updateMerchantApplication - final update data:", updateData);
      
      const [updated] = await db
        .update(merchantApplications)
        .set(updateData)
        .where(eq(merchantApplications.id, id))
        .returning();
        
      safeLog.log("updateMerchantApplication - updated result:", updated);
      return updated;
    } catch (error) {
      safeLog.error("updateMerchantApplication - Database error:", error);
      throw error;
    }
  }

  // Helper method to sanitize application data
  private sanitizeApplicationData(data: Partial<InsertMerchantApplication>): Partial<InsertMerchantApplication> {
    const sanitized: any = {};
    
    // Define date fields that should be converted to Date objects or null
    const dateFields = [
      'merchantDate', 'corduroDate', 'merchantSignatureDate', 'partnerSignatureDate',
      'createdAt', 'updatedAt', 'submittedAt', 'reviewedAt', 'lastSavedAt',
      'mpaSignedDate', 'entityStartDate', 'ownerBirthday', 'ownerIdExpDate', 'ownerIdDateIssued'
    ];
    
    console.log("sanitizeApplicationData - input data keys:", Object.keys(data));
    console.log("sanitizeApplicationData - date fields to filter:", dateFields);
    
    for (const [key, value] of Object.entries(data)) {
      console.log(`Processing field ${key}:`, value, `(type: ${typeof value})`);
      
      // Always preserve clientId and status - these are required
      if (key === 'clientId' || key === 'status') {
        sanitized[key] = value;
        continue;
      }
      
      // Skip undefined AND null values entirely
      if (value === undefined || value === null) {
        console.log(`Skipping ${key} because it's ${value}`);
        continue;
      }
      
      // Handle date fields specially
      if (dateFields.includes(key)) {
        console.log(`Processing date field ${key}:`, value);
        if (value === null || value === '' || value === undefined) {
          // Skip null/empty date fields entirely - let the database handle defaults
          console.log(`Skipping date field ${key} because it's null/empty`);
          continue;
        } else if (typeof value === 'string') {
          // Try to parse string dates
          if (value.trim() === '') {
            console.log(`Skipping date field ${key} because it's empty string`);
            continue; // Skip empty strings
          }
          const parsed = new Date(value);
          if (!isNaN(parsed.getTime())) {
            console.log(`Parsed date field ${key} successfully:`, parsed);
            sanitized[key] = parsed;
          } else {
            console.log(`Skipping date field ${key} because it's invalid date string`);
          }
          // Skip invalid date strings
        } else if (value instanceof Date && !isNaN(value.getTime())) {
          console.log(`Keeping valid Date object for ${key}:`, value);
          sanitized[key] = value;
        } else {
          console.log(`Skipping date field ${key} because it's invalid type:`, typeof value);
        }
        // Skip any other invalid date values
        continue;
      }
      
      // Skip empty strings for non-essential fields
      if (typeof value === 'string' && value.trim() === '') {
        console.log(`Skipping empty string field ${key}`);
        continue;
      }
      
      // Handle arrays and objects that need JSON serialization
      if (Array.isArray(value)) {
        console.log(`Processing array field ${key}:`, value.length, 'items');
        // Filter out any undefined items and ensure all items are properly serializable
        const cleanArray = value.filter(item => item !== undefined && item !== null).map(item => 
          typeof item === 'object' && item !== null ? this.sanitizeObject(item) : item
        );
        if (cleanArray.length > 0) {
          sanitized[key] = cleanArray;
        }
      } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        console.log(`Processing object field ${key}:`, Object.keys(value));
        // Sanitize nested objects
        const cleanObject = this.sanitizeObject(value);
        if (Object.keys(cleanObject).length > 0) {
          sanitized[key] = cleanObject;
        }
      } else {
        // Keep primitive values as-is
        console.log(`Keeping primitive field ${key}:`, value);
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  // Helper method to sanitize nested objects
  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.filter(item => item !== undefined && item !== null).map(item => 
        typeof item === 'object' && item !== null ? this.sanitizeObject(item) : item
      );
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip null and undefined values in nested objects too
        if (value !== undefined && value !== null) {
          if (typeof value === 'string' && value.trim() === '') {
            // Skip empty strings in nested objects
            continue;
          }
          if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            const cleanNested = this.sanitizeObject(value);
            if (Object.keys(cleanNested).length > 0) {
              sanitized[key] = cleanNested;
            }
          } else {
            sanitized[key] = value;
          }
        }
      }
      return sanitized;
    }
    
    return obj;
  }

  async updateMerchantApplicationStatus(
    id: string,
    status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<MerchantApplication> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'SUBMITTED') {
      updateData.submittedAt = new Date();
    }

    if (status === 'APPROVED' || status === 'REJECTED') {
      updateData.reviewedAt = new Date();
    }

    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const [application] = await db
      .update(merchantApplications)
      .set(updateData)
      .where(eq(merchantApplications.id, id))
      .returning();
    return application;
  }

  async deleteMerchantApplication(id: string): Promise<void> {
    await db.delete(merchantApplications).where(eq(merchantApplications.id, id));
  }

  async updateMerchantApplicationIrisLeadId(id: string, irisLeadId: string): Promise<MerchantApplication> {
    const [application] = await db
      .update(merchantApplications)
      .set({ irisLeadId, updatedAt: new Date() })
      .where(eq(merchantApplications.id, id))
      .returning();
    return application;
  }

  async updateMerchantApplicationESignature(
    id: string,
    data: {
      eSignatureStatus?: 'NOT_SENT' | 'PENDING' | 'SIGNED' | 'DECLINED' | 'EXPIRED';
      eSignatureApplicationId?: string;
      eSignatureSentAt?: Date;
      eSignatureCompletedAt?: Date;
      signedDocumentId?: number;
    }
  ): Promise<MerchantApplication> {
    const [application] = await db
      .update(merchantApplications)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(merchantApplications.id, id))
      .returning();
    return application;
  }

  async getMerchantApplicationByESignatureId(eSignatureApplicationId: string): Promise<MerchantApplication | undefined> {
    const [application] = await db
      .select()
      .from(merchantApplications)
      .where(eq(merchantApplications.eSignatureApplicationId, eSignatureApplicationId));
    return application;
  }

  async validateMerchantApplicationOwnership(merchantApplicationId: string, userId: string): Promise<boolean> {
    // Get the merchant application
    const application = await this.getMerchantApplicationById(merchantApplicationId);
    if (!application) {
      return false;
    }

    // Get the client for this application
    const client = await this.getClientById(application.clientId);
    if (!client) {
      return false;
    }

    // Check if the client belongs to the user
    return client.userId === userId;
  }

  // MFA-related methods
  async enableUserMfa(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    await db
      .update(users)
      .set({
        mfaEnabled: true,
        mfaRequired: false, // No longer required once enabled
        mfaSecret: secret,
        mfaBackupCodes: backupCodes,
        mfaSetupAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async disableUserMfa(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaSetupAt: null,
        mfaLastUsed: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserMfaLastUsed(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        mfaLastUsed: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserMfaBackupCodes(userId: string, backupCodes: string[]): Promise<void> {
    await db
      .update(users)
      .set({
        mfaBackupCodes: backupCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Email MFA methods
  async enableEmailMfa(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        mfaEmailEnabled: true,
        mfaRequired: false, // No longer required once any MFA is enabled
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async disableEmailMfa(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        mfaEmailEnabled: false,
        mfaEmailOtp: null,
        mfaEmailOtpExpiresAt: null,
        mfaEmailOtpAttempts: 0,
        mfaEmailSendCount: 0,
        mfaEmailLastSentAt: null,
        mfaEmailRateLimitResetAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async saveEmailOtp(userId: string, hashedOtp: string, expiresAt: Date): Promise<void> {
    await db
      .update(users)
      .set({
        mfaEmailOtp: hashedOtp,
        mfaEmailOtpExpiresAt: expiresAt,
        mfaEmailOtpAttempts: 0, // Reset attempts on new OTP
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getEmailOtpData(userId: string): Promise<{
    otp?: string;
    expiresAt?: Date;
    attempts: number;
  }> {
    const [user] = await db
      .select({
        otp: users.mfaEmailOtp,
        expiresAt: users.mfaEmailOtpExpiresAt,
        attempts: users.mfaEmailOtpAttempts,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return { attempts: 0 };
    }

    return {
      otp: user.otp || undefined,
      expiresAt: user.expiresAt ? new Date(user.expiresAt) : undefined,
      attempts: user.attempts || 0,
    };
  }

  async incrementEmailOtpAttempts(userId: string): Promise<void> {
    // Get current attempts and increment
    const [user] = await db
      .select({ attempts: users.mfaEmailOtpAttempts })
      .from(users)
      .where(eq(users.id, userId));

    const newAttempts = (user?.attempts || 0) + 1;

    await db
      .update(users)
      .set({
        mfaEmailOtpAttempts: newAttempts,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async clearEmailOtp(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        mfaEmailOtp: null,
        mfaEmailOtpExpiresAt: null,
        mfaEmailOtpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateEmailRateLimit(userId: string, sendCount: number, resetAt: Date): Promise<void> {
    await db
      .update(users)
      .set({
        mfaEmailSendCount: sendCount,
        mfaEmailLastSentAt: new Date(),
        mfaEmailRateLimitResetAt: resetAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getEmailRateLimitData(userId: string): Promise<{
    sendCount: number;
    lastSentAt?: Date;
    resetAt?: Date;
  }> {
    const [user] = await db
      .select({
        sendCount: users.mfaEmailSendCount,
        lastSentAt: users.mfaEmailLastSentAt,
        resetAt: users.mfaEmailRateLimitResetAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return { sendCount: 0 };
    }

    return {
      sendCount: user.sendCount || 0,
      lastSentAt: user.lastSentAt ? new Date(user.lastSentAt) : undefined,
      resetAt: user.resetAt ? new Date(user.resetAt) : undefined,
    };
  }

  // Invitation code operations
  async createInvitationCode(code: string, label: string, createdBy: string): Promise<InvitationCode> {
    const [invitationCode] = await db
      .insert(invitationCodes)
      .values({
        code,
        label,
        createdBy,
        status: 'ACTIVE',
      })
      .returning();
    return invitationCode;
  }

  async getInvitationCodeByCode(code: string): Promise<InvitationCode | undefined> {
    const [invitationCode] = await db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code));
    return invitationCode;
  }

  async getAllInvitationCodes(): Promise<InvitationCode[]> {
    const codes = await db
      .select()
      .from(invitationCodes)
      .orderBy(desc(invitationCodes.createdAt));
    return codes;
  }

  async markInvitationCodeAsUsed(code: string, userId: string): Promise<InvitationCode> {
    const [invitationCode] = await db
      .update(invitationCodes)
      .set({
        status: 'USED',
        usedBy: userId,
        usedAt: new Date(),
      })
      .where(eq(invitationCodes.code, code))
      .returning();
    return invitationCode;
  }

  async deleteInvitationCode(id: string): Promise<void> {
    try {
      await db
        .delete(invitationCodes)
        .where(eq(invitationCodes.id, id));
    } catch (error) {
      console.error("Error in deleteInvitationCode:", error);
      throw new Error("Failed to delete invitation code");
    }
  }
}

export const storage = new DatabaseStorage();
