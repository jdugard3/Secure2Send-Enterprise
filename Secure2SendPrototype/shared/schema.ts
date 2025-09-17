import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'CLIENT']);
export const clientStatusEnum = pgEnum('client_status', ['PENDING', 'APPROVED', 'REJECTED', 'INCOMPLETE']);
export const documentTypeEnum = pgEnum('document_type', [
  'SS4_EIN_LETTER',
  'W9',
  'BENEFICIAL_OWNERSHIP',
  'DRIVERS_LICENSE',
  'PASSPORT',
  'CANNABIS_LICENSE',
  'SEED_TO_SALE_INFO',
  'POS_INFO',
  'BANKING_INFO',
  'BANK_STATEMENTS',
  'ARTICLES_OF_INCORPORATION',
  'OPERATING_AGREEMENT',
  'BUSINESS_LICENSE',
  'VOIDED_CHECK',
  'COA_PRODUCTS',
  'PROVIDER_CONTRACT',
  'INSURANCE_COVERAGE'
]);
export const documentStatusEnum = pgEnum('document_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const merchantApplicationStatusEnum = pgEnum('merchant_application_status', ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']);
export const ownershipTypeEnum = pgEnum('ownership_type', ['NON_PROFIT', 'SOLE_PROPRIETORSHIP', 'GOVERNMENT', 'PERSONAL', 'PARTNERSHIP_LLP', 'FINANCIAL_INSTITUTION', 'CORPORATION_PUBLICLY_TRADED', 'CORPORATION_PRIVATELY_HELD', 'LLC', 'S_CORP']);
export const processingCategoryEnum = pgEnum('processing_category', ['MOBILE', 'CARD_NOT_PRESENT_E_COMMERCE', 'CARD_PRESENT_RETAIL', 'MAIL_ORDER_TELEPHONE_MOTO', 'OTHER']);
export const auditLogEnum = pgEnum('audit_action', [
  'USER_LOGIN',
  'USER_LOGOUT', 
  'DOCUMENT_UPLOAD',
  'DOCUMENT_DOWNLOAD',
  'DOCUMENT_APPROVE',
  'DOCUMENT_REJECT',
  'DOCUMENT_DELETE',
  'CLIENT_STATUS_UPDATE',
  'ADMIN_IMPERSONATE_START',
  'ADMIN_IMPERSONATE_END',
  'SENSITIVE_DATA_ACCESS',
  'SENSITIVE_DATA_UPDATE',
  'FILE_DOWNLOAD',
  'MERCHANT_APPLICATION_CREATE',
  'MERCHANT_APPLICATION_UPDATE',
  'MERCHANT_APPLICATION_SUBMIT',
  'MERCHANT_APPLICATION_REVIEW'
]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  companyName: varchar("company_name"),
  role: userRoleEnum("role").default('CLIENT'),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: clientStatusEnum("status").default('PENDING'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  filePath: text("file_path").notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  status: documentStatusEnum("status").default('PENDING'),
  rejectionReason: text("rejection_reason"),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  // Cloudflare R2 fields
  r2Key: text("r2_key"),
  r2Url: text("r2_url"),
  encryptionKeyId: varchar("encryption_key_id"),
});

// Merchant applications table
export const merchantApplications = pgTable("merchant_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  status: merchantApplicationStatusEnum("status").default('DRAFT'),
  
  // Business Information
  legalBusinessName: varchar("legal_business_name"),
  dbaBusinessName: varchar("dba_business_name"),
  billingAddress: text("billing_address"),
  locationAddress: text("location_address"),
  city: varchar("city"),
  state: varchar("state"),
  zip: varchar("zip"),
  businessPhone: varchar("business_phone"),
  businessFaxNumber: varchar("business_fax_number"),
  customerServicePhone: varchar("customer_service_phone"),
  federalTaxIdNumber: varchar("federal_tax_id_number"),
  contactName: varchar("contact_name"),
  contactPhoneNumber: varchar("contact_phone_number"),
  contactEmail: varchar("contact_email"),
  websiteAddress: varchar("website_address"),
  
  // Business Description
  processingCategories: jsonb("processing_categories"), // Array of selected categories
  ownershipType: ownershipTypeEnum("ownership_type"),
  
  // Owner/Principal Officers (stored as JSON array)
  principalOfficers: jsonb("principal_officers"),
  
  // Settlement/Banking
  bankName: varchar("bank_name"),
  abaRoutingNumber: varchar("aba_routing_number"),
  accountName: varchar("account_name"),
  ddaNumber: varchar("dda_number"),
  
  // Fee Schedule Information
  feeScheduleData: jsonb("fee_schedule_data"),
  
  // Supporting Information
  supportingInformation: jsonb("supporting_information"),
  
  // Equipment Information
  equipmentData: jsonb("equipment_data"),
  
  // Beneficial Ownership (stored as JSON array)
  beneficialOwners: jsonb("beneficial_owners"),
  
  // Corporate Resolution and Certification
  corporateResolution: text("corporate_resolution"),
  merchantSignature: varchar("merchant_signature"),
  merchantName: varchar("merchant_name"),
  merchantTitle: varchar("merchant_title"),
  merchantDate: timestamp("merchant_date"),
  corduroSignature: varchar("corduro_signature"),
  corduroName: varchar("corduro_name"),
  corduroTitle: varchar("corduro_title"),
  corduroDate: timestamp("corduro_date"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  
  // Auto-save tracking
  lastSavedAt: timestamp("last_saved_at").defaultNow(),
});

// Sensitive data table for encrypted PII
export const sensitiveData = pgTable("sensitive_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  
  // Encrypted fields
  ssn: text("ssn"), // Encrypted SSN
  bankAccountNumber: text("bank_account_number"), // Encrypted
  routingNumber: text("routing_number"), // Encrypted
  taxId: text("tax_id"), // Encrypted
  
  // Metadata
  encryptedAt: timestamp("encrypted_at").defaultNow(),
  lastAccessed: timestamp("last_accessed").defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: auditLogEnum("action").notNull(),
  resourceType: varchar("resource_type"), // 'document', 'client', 'user'
  resourceId: varchar("resource_id"),
  details: jsonb("details"), // Additional context
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  sensitiveData: many(sensitiveData),
  auditLogs: many(auditLogs),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  documents: many(documents),
  sensitiveData: many(sensitiveData),
  merchantApplications: many(merchantApplications),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
}));

export const merchantApplicationsRelations = relations(merchantApplications, ({ one }) => ({
  client: one(clients, {
    fields: [merchantApplications.clientId],
    references: [clients.id],
  }),
  reviewedByUser: one(users, {
    fields: [merchantApplications.reviewedBy],
    references: [users.id],
  }),
}));

export const sensitiveDataRelations = relations(sensitiveData, ({ one }) => ({
  user: one(users, {
    fields: [sensitiveData.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [sensitiveData.clientId],
    references: [clients.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  reviewedAt: true,
});

export const insertMerchantApplicationSchema = createInsertSchema(merchantApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  reviewedAt: true,
  lastSavedAt: true,
}).partial(); // Make all fields optional for draft applications

// Types
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Schema for user login  
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginData = z.infer<typeof loginSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertMerchantApplication = z.infer<typeof insertMerchantApplicationSchema>;
export type MerchantApplication = typeof merchantApplications.$inferSelect;

// Additional types
export type InsertSensitiveData = typeof sensitiveData.$inferInsert;
export type SensitiveData = typeof sensitiveData.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;

// Combined types
export type ClientWithUser = Client & { user: User };
export type DocumentWithClient = Document & { client: ClientWithUser };
export type MerchantApplicationWithClient = MerchantApplication & { client: ClientWithUser };
