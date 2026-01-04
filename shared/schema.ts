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
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'CLIENT', 'AGENT']);
export const clientStatusEnum = pgEnum('client_status', ['PENDING', 'APPROVED', 'REJECTED', 'INCOMPLETE']);
export const documentTypeEnum = pgEnum('document_type', [
  'SS4_EIN_LETTER',
  'W9',
  'BENEFICIAL_OWNERSHIP',
  'DRIVERS_LICENSE',
  'PASSPORT',
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
  'MERCHANT_APPLICATION_REVIEW',
  'MERCHANT_APPLICATION_DELETE',
  'MFA_ENABLED',
  'MFA_DISABLED',
  'MFA_BACKUP_CODE_USED',
  'MFA_SETUP_COMPLETED',
  'MFA_VERIFICATION_FAILED',
  'MFA_VERIFICATION_SUCCESS',
  'MFA_EMAIL_ENABLED',
  'MFA_EMAIL_DISABLED',
  'MFA_EMAIL_OTP_SENT',
  'MFA_EMAIL_OTP_VERIFIED',
  'MFA_EMAIL_OTP_FAILED',
  'MFA_EMAIL_RATE_LIMIT_EXCEEDED',
  'MFA_METHOD_SWITCHED',
  'INVITATION_CODE_CREATED',
  'INVITATION_CODE_USED',
  'INVITATION_CODE_DELETED',
  'OCR_EXTRACTION_STARTED',
  'OCR_EXTRACTION_COMPLETED',
  'OCR_EXTRACTION_FAILED',
  'OCR_DATA_REVIEWED',
  'OCR_DATA_APPLIED',
  'OCR_DATA_DECRYPTED'
]);
export const invitationCodeStatusEnum = pgEnum('invitation_code_status', ['ACTIVE', 'USED', 'EXPIRED']);
export const onboardingStepEnum = pgEnum('onboarding_step', ['PART1', 'DOCUMENTS', 'PART2', 'REVIEW', 'COMPLETE']);

// Login attempts tracking
export const loginAttempts = pgTable("login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(), // Store email for failed attempts (case-insensitive)
  ipAddress: varchar("ip_address").notNull(),
  userId: varchar("user_id").references(() => users.id), // May be null if user doesn't exist
  attemptCount: integer("attempt_count").notNull().default(1),
  lastAttemptAt: timestamp("last_attempt_at").defaultNow(),
  lockoutUntil: timestamp("lockout_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_login_attempts_email_ip").on(table.email, table.ipAddress),
  index("IDX_login_attempts_lockout").on(table.lockoutUntil),
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
  // MFA fields - TOTP (Authenticator App)
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaRequired: boolean("mfa_required").default(true), // New users must set up MFA
  mfaSecret: text("mfa_secret"),
  mfaBackupCodes: text("mfa_backup_codes").array(),
  mfaSetupAt: timestamp("mfa_setup_at"),
  mfaLastUsed: timestamp("mfa_last_used"),
  // MFA fields - Email OTP
  mfaEmailEnabled: boolean("mfa_email_enabled").default(false),
  mfaEmailOtp: text("mfa_email_otp"),
  mfaEmailOtpExpiresAt: timestamp("mfa_email_otp_expires_at"),
  mfaEmailOtpAttempts: integer("mfa_email_otp_attempts").default(0),
  mfaEmailLastSentAt: timestamp("mfa_email_last_sent_at"),
  mfaEmailSendCount: integer("mfa_email_send_count").default(0),
  mfaEmailRateLimitResetAt: timestamp("mfa_email_rate_limit_reset_at"),
  // Password reset fields
  passwordResetToken: text("password_reset_token"),
  passwordResetTokenExpiresAt: timestamp("password_reset_token_expires_at"),
  passwordResetRequestedAt: timestamp("password_reset_requested_at"),
  // Onboarding progress tracking
  onboardingStep: onboardingStepEnum("onboarding_step").default('PART1'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: clientStatusEnum("status").default('PENDING'),
  irisLeadId: varchar("iris_lead_id"), // IRIS CRM lead ID for integration
  agentId: varchar("agent_id").references(() => users.id), // Agent who brought in this merchant
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_clients_agent_id").on(table.agentId),
]);

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
  merchantApplicationId: varchar("merchant_application_id").references(() => merchantApplications.id),
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
  irisLeadId: varchar("iris_lead_id"), // IRIS CRM lead ID for this specific merchant application
  
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
  
  // IRIS CRM Integration Fields
  // MPA and Sales Information
  mpaSignedDate: timestamp("mpa_signed_date"),
  salesRepName: varchar("sales_rep_name"),
  
  // Enhanced DBA Information
  productOrServiceSold: text("product_or_service_sold"),
  dbaWebsite: varchar("dba_website"),
  multipleLocations: boolean("multiple_locations").default(false),
  
  // Enhanced Corporate Information
  legalContactName: varchar("legal_contact_name"),
  legalPhone: varchar("legal_phone"),
  legalEmail: varchar("legal_email"),
  incorporationState: varchar("incorporation_state"),
  entityStartDate: timestamp("entity_start_date"),
  
  // Transaction and Volume
  averageTicket: varchar("average_ticket"), // Using varchar to handle decimal precision
  highTicket: varchar("high_ticket"),
  monthlySalesVolume: varchar("monthly_sales_volume"),
  monthlyTransactions: integer("monthly_transactions"),
  annualVolume: varchar("annual_volume"),
  annualTransactions: integer("annual_transactions"),
  
  // Enhanced Banking Information
  accountOwnerFirstName: varchar("account_owner_first_name"),
  accountOwnerLastName: varchar("account_owner_last_name"),
  nameOnBankAccount: varchar("name_on_bank_account"),
  bankOfficerName: varchar("bank_officer_name"),
  bankOfficerPhone: varchar("bank_officer_phone"),
  bankOfficerEmail: varchar("bank_officer_email"),
  
  // Enhanced Owner Information
  ownerFullName: varchar("owner_full_name"),
  ownerFirstName: varchar("owner_first_name"),
  ownerLastName: varchar("owner_last_name"),
  ownerOfficer: varchar("owner_officer"),
  ownerTitle: varchar("owner_title"),
  ownerOwnershipPercentage: varchar("owner_ownership_percentage"),
  ownerMobilePhone: varchar("owner_mobile_phone"),
  ownerEmail: varchar("owner_email"),
  ownerSsn: varchar("owner_ssn"),
  ownerBirthday: timestamp("owner_birthday"),
  ownerStateIssuedIdNumber: varchar("owner_state_issued_id_number"),
  ownerIdExpDate: timestamp("owner_id_exp_date"),
  ownerIssuingState: varchar("owner_issuing_state"),
  ownerIdDateIssued: timestamp("owner_id_date_issued"),
  ownerLegalAddress: text("owner_legal_address"),
  ownerCity: varchar("owner_city"),
  ownerState: varchar("owner_state"),
  ownerZip: varchar("owner_zip"),
  ownerCountry: varchar("owner_country").default('US'),
  
  // Financial Representative (JSONB for complex structure)
  financialRepresentative: jsonb("financial_representative"),
  
  // Business Operations
  businessType: varchar("business_type").default('Retail'),
  refundGuarantee: boolean("refund_guarantee").default(false),
  refundDays: integer("refund_days"),
  posSystem: varchar("pos_system"),
  
  // Authorized Contacts (JSONB for array of contacts)
  authorizedContacts: jsonb("authorized_contacts"),
  
  // Auto-filled fields for IRIS integration
  processedCardsPast: boolean("processed_cards_past").default(false),
  previouslyProcessed: boolean("previously_processed").default(false),
  automaticBilling: boolean("automatic_billing").default(false),
  cardholderData3rdParty: boolean("cardholder_data_3rd_party").default(false),
  
  // Corporate Resolution and Certification
  corporateResolution: text("corporate_resolution"),
  merchantSignature: varchar("merchant_signature"),
  merchantName: varchar("merchant_name"),
  merchantTitle: varchar("merchant_title"),
  merchantDate: timestamp("merchant_date"),
  agreementAccepted: boolean("agreement_accepted").default(false),
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
  
  // Application flow tracking
  currentStep: integer("current_step").default(1), // 1=Basic Info, 2=Documents, 3=Review, 4=Submit
  
  // E-Signature tracking
  eSignatureStatus: text("e_signature_status").default('NOT_SENT'), // 'NOT_SENT' | 'PENDING' | 'SIGNED' | 'DECLINED' | 'EXPIRED'
  eSignatureApplicationId: text("e_signature_application_id"), // IRIS e-signature application ID
  eSignatureSentAt: timestamp("e_signature_sent_at"),
  eSignatureCompletedAt: timestamp("e_signature_completed_at"),
  signedDocumentId: integer("signed_document_id"), // Reference to signed document
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

// Extracted document data table for OCR results
export const extractedDocumentData = pgTable("extracted_document_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Foreign keys
  documentId: varchar("document_id").references(() => documents.id, { onDelete: 'cascade' }),
  merchantApplicationId: varchar("merchant_application_id").references(() => merchantApplications.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Public (masked) data for UI display
  extractedDataPublic: jsonb("extracted_data_public").notNull(),
  
  // Encrypted sensitive fields (JSONB object with encrypted values)
  encryptedFields: jsonb("encrypted_fields").notNull(), // Stores encrypted sensitive fields as key-value pairs
  
  // Document tracking
  documentHash: varchar("document_hash", { length: 64 }).notNull(), // SHA-256 hash for duplicate detection
  extractionTimestamp: timestamp("extraction_timestamp").defaultNow().notNull(),
  confidenceScore: varchar("confidence_score"), // Stored as string to preserve precision (0.00-1.00)
  
  // User review tracking
  userReviewed: boolean("user_reviewed").default(false),
  reviewedAt: timestamp("reviewed_at"),
  appliedToApplication: boolean("applied_to_application").default(false),
  appliedAt: timestamp("applied_at"),
  
  // Auto-expiry (30 days default)
  expiresAt: timestamp("expires_at").default(sql`NOW() + INTERVAL '30 days'`),
  
  // Audit fields for compliance
  processingIpAddress: varchar("processing_ip_address", { length: 45 }), // IPv6 support
  processingUserAgent: text("processing_user_agent"),
}, (table) => [
  index("IDX_extracted_document_data_document_id").on(table.documentId),
  index("IDX_extracted_document_data_merchant_app_id").on(table.merchantApplicationId),
  index("IDX_extracted_document_data_user_id").on(table.userId),
  index("IDX_extracted_document_data_document_hash").on(table.documentHash),
  index("IDX_extracted_document_data_expires_at").on(table.expiresAt),
  index("IDX_extracted_document_data_user_reviewed").on(table.userReviewed),
  index("IDX_extracted_document_data_applied").on(table.appliedToApplication),
]);

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

// Invitation codes table for merchant onboarding
export const invitationCodes = pgTable("invitation_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").unique().notNull(),
  label: varchar("label").notNull(), // Who this code is for (e.g., "Joe's Pizza Shop")
  status: invitationCodeStatusEnum("status").default('ACTIVE'),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  usedBy: varchar("used_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  sensitiveData: many(sensitiveData),
  auditLogs: many(auditLogs),
  extractedDocumentData: many(extractedDocumentData),
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

export const documentsRelations = relations(documents, ({ one, many }) => ({
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
  merchantApplication: one(merchantApplications, {
    fields: [documents.merchantApplicationId],
    references: [merchantApplications.id],
  }),
  extractedData: many(extractedDocumentData),
}));

export const merchantApplicationsRelations = relations(merchantApplications, ({ one, many }) => ({
  client: one(clients, {
    fields: [merchantApplications.clientId],
    references: [clients.id],
  }),
  reviewedByUser: one(users, {
    fields: [merchantApplications.reviewedBy],
    references: [users.id],
  }),
  documents: many(documents),
  extractedData: many(extractedDocumentData),
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

export const invitationCodesRelations = relations(invitationCodes, ({ one }) => ({
  createdByUser: one(users, {
    fields: [invitationCodes.createdBy],
    references: [users.id],
  }),
  usedByUser: one(users, {
    fields: [invitationCodes.usedBy],
    references: [users.id],
  }),
}));

export const extractedDocumentDataRelations = relations(extractedDocumentData, ({ one }) => ({
  document: one(documents, {
    fields: [extractedDocumentData.documentId],
    references: [documents.id],
  }),
  merchantApplication: one(merchantApplications, {
    fields: [extractedDocumentData.merchantApplicationId],
    references: [merchantApplications.id],
  }),
  user: one(users, {
    fields: [extractedDocumentData.userId],
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
export type InsertInvitationCode = typeof invitationCodes.$inferInsert;
export type InvitationCode = typeof invitationCodes.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertExtractedDocumentData = typeof extractedDocumentData.$inferInsert;
export type ExtractedDocumentData = typeof extractedDocumentData.$inferSelect;
export type OnboardingStep = 'PART1' | 'DOCUMENTS' | 'PART2' | 'REVIEW' | 'COMPLETE';

// Combined types
export type ClientWithUser = Client & { user: User };
export type DocumentWithClient = Document & { client: ClientWithUser };
export type MerchantApplicationWithClient = MerchantApplication & { client: ClientWithUser };
