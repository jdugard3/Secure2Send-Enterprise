import {
  users,
  clients,
  documents,
  merchantApplications,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
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
  deleteMerchantApplication(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
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
        rows.map(row => ({
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
        rows.map(row => ({
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
    // Sanitize the data before insertion
    const sanitizedData = this.sanitizeApplicationData(application);
    
    const [merchantApplication] = await db
      .insert(merchantApplications)
      .values(sanitizedData)
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
        ...row.merchantApplications,
        client: {
          ...row.clients!,
          user: row.users!,
        },
      }));
  }

  async updateMerchantApplication(id: string, application: Partial<InsertMerchantApplication>): Promise<MerchantApplication> {
    try {
      console.log("updateMerchantApplication - id:", id);
      console.log("updateMerchantApplication - application data:", JSON.stringify(application, null, 2));
      
      // Sanitize the data to remove undefined values and ensure proper JSON serialization
      const sanitizedData = this.sanitizeApplicationData(application);
      console.log("updateMerchantApplication - sanitized data:", JSON.stringify(sanitizedData, null, 2));
      
      // Always set these timestamps manually (don't let them come from frontend)
      const updateData = {
        ...sanitizedData,
        updatedAt: new Date(),
        lastSavedAt: new Date(),
      };
      
      console.log("updateMerchantApplication - final update data:", JSON.stringify(updateData, null, 2));
      
      const [updated] = await db
        .update(merchantApplications)
        .set(updateData)
        .where(eq(merchantApplications.id, id))
        .returning();
        
      console.log("updateMerchantApplication - updated result:", JSON.stringify(updated, null, 2));
      return updated;
    } catch (error) {
      console.error("updateMerchantApplication - Database error:", error);
      throw error;
    }
  }

  // Helper method to sanitize application data
  private sanitizeApplicationData(data: Partial<InsertMerchantApplication>): Partial<InsertMerchantApplication> {
    const sanitized: any = {};
    
    // Define date fields that should be converted to Date objects or null
    const dateFields = [
      'merchantDate', 'corduroDate', 'merchantSignatureDate', 'partnerSignatureDate',
      'createdAt', 'updatedAt', 'submittedAt', 'reviewedAt', 'lastSavedAt'
    ];
    
    console.log("sanitizeApplicationData - input data keys:", Object.keys(data));
    console.log("sanitizeApplicationData - date fields to filter:", dateFields);
    
    for (const [key, value] of Object.entries(data)) {
      console.log(`Processing field ${key}:`, value, `(type: ${typeof value})`);
      
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
}

export const storage = new DatabaseStorage();
