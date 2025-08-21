import {
  users,
  clients,
  documents,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Document,
  type InsertDocument,
  type ClientWithUser,
  type DocumentWithClient,
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
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsByClientId(clientId: string): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | undefined>;
  getAllDocumentsForReview(): Promise<DocumentWithClient[]>;
  updateDocumentStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
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
}

export const storage = new DatabaseStorage();
