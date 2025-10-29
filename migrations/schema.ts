import { pgTable, index, varchar, jsonb, timestamp, unique, boolean, text, foreignKey, integer, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const auditAction = pgEnum("audit_action", ['USER_LOGIN', 'USER_LOGOUT', 'DOCUMENT_UPLOAD', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_APPROVE', 'DOCUMENT_REJECT', 'DOCUMENT_DELETE', 'CLIENT_STATUS_UPDATE', 'ADMIN_IMPERSONATE_START', 'ADMIN_IMPERSONATE_END', 'SENSITIVE_DATA_ACCESS', 'SENSITIVE_DATA_UPDATE', 'FILE_DOWNLOAD', 'MERCHANT_APPLICATION_CREATE', 'MERCHANT_APPLICATION_UPDATE', 'MERCHANT_APPLICATION_SUBMIT', 'MERCHANT_APPLICATION_REVIEW', 'MFA_ENABLED', 'MFA_DISABLED', 'MFA_BACKUP_CODE_USED', 'MFA_SETUP_COMPLETED', 'MFA_VERIFICATION_FAILED', 'MFA_VERIFICATION_SUCCESS'])
export const clientStatus = pgEnum("client_status", ['PENDING', 'APPROVED', 'REJECTED', 'INCOMPLETE'])
export const documentStatus = pgEnum("document_status", ['PENDING', 'APPROVED', 'REJECTED'])
export const documentType = pgEnum("document_type", ['SS4_EIN_LETTER', 'W9', 'BENEFICIAL_OWNERSHIP', 'DRIVERS_LICENSE', 'PASSPORT', 'CANNABIS_LICENSE', 'SEED_TO_SALE_INFO', 'POS_INFO', 'BANKING_INFO', 'BANK_STATEMENTS', 'ARTICLES_OF_INCORPORATION', 'OPERATING_AGREEMENT', 'BUSINESS_LICENSE', 'VOIDED_CHECK', 'COA_PRODUCTS', 'PROVIDER_CONTRACT', 'INSURANCE_COVERAGE'])
export const merchantApplicationStatus = pgEnum("merchant_application_status", ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'])
export const ownershipType = pgEnum("ownership_type", ['NON_PROFIT', 'SOLE_PROPRIETORSHIP', 'GOVERNMENT', 'PERSONAL', 'PARTNERSHIP_LLP', 'FINANCIAL_INSTITUTION', 'CORPORATION_PUBLICLY_TRADED', 'CORPORATION_PRIVATELY_HELD', 'LLC', 'S_CORP'])
export const processingCategory = pgEnum("processing_category", ['MOBILE', 'CARD_NOT_PRESENT_E_COMMERCE', 'CARD_PRESENT_RETAIL', 'MAIL_ORDER_TELEPHONE_MOTO', 'OTHER'])
export const userRole = pgEnum("user_role", ['ADMIN', 'CLIENT'])


export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	email: varchar().notNull(),
	password: varchar().notNull(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	companyName: varchar("company_name"),
	role: userRole().default('CLIENT'),
	emailVerified: boolean("email_verified").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	mfaEnabled: boolean("mfa_enabled").default(false),
	mfaSecret: text("mfa_secret"),
	mfaBackupCodes: text("mfa_backup_codes").array(),
	mfaSetupAt: timestamp("mfa_setup_at", { mode: 'string' }),
	mfaLastUsed: timestamp("mfa_last_used", { mode: 'string' }),
	mfaRequired: boolean("mfa_required").default(true),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const auditLogs = pgTable("audit_logs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	action: auditAction().notNull(),
	resourceType: varchar("resource_type"),
	resourceId: varchar("resource_id"),
	details: jsonb(),
	ipAddress: varchar("ip_address"),
	userAgent: text("user_agent"),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_logs_user_id_users_id_fk"
		}),
]);

export const documents = pgTable("documents", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	filename: varchar().notNull(),
	originalName: varchar("original_name").notNull(),
	fileSize: integer("file_size").notNull(),
	mimeType: varchar("mime_type").notNull(),
	filePath: text("file_path").notNull(),
	documentType: documentType("document_type").notNull(),
	status: documentStatus().default('PENDING'),
	rejectionReason: text("rejection_reason"),
	clientId: varchar("client_id").notNull(),
	merchantApplicationId: varchar("merchant_application_id"),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	r2Key: text("r2_key"),
	r2Url: text("r2_url"),
	encryptionKeyId: varchar("encryption_key_id"),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "documents_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.merchantApplicationId],
			foreignColumns: [merchantApplications.id],
			name: "documents_merchant_application_id_fkey"
		}),
]);

export const sensitiveData = pgTable("sensitive_data", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	clientId: varchar("client_id").notNull(),
	ssn: text(),
	bankAccountNumber: text("bank_account_number"),
	routingNumber: text("routing_number"),
	taxId: text("tax_id"),
	encryptedAt: timestamp("encrypted_at", { mode: 'string' }).defaultNow(),
	lastAccessed: timestamp("last_accessed", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sensitive_data_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "sensitive_data_client_id_clients_id_fk"
		}),
]);

export const clients = pgTable("clients", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	status: clientStatus().default('PENDING'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	irisLeadId: varchar("iris_lead_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "clients_user_id_users_id_fk"
		}),
]);

export const merchantApplications = pgTable("merchant_applications", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	clientId: varchar("client_id").notNull(),
	status: merchantApplicationStatus().default('DRAFT'),
	irisLeadId: varchar("iris_lead_id"),
	legalBusinessName: varchar("legal_business_name"),
	dbaBusinessName: varchar("dba_business_name"),
	billingAddress: text("billing_address"),
	locationAddress: text("location_address"),
	city: varchar(),
	state: varchar(),
	zip: varchar(),
	businessPhone: varchar("business_phone"),
	businessFaxNumber: varchar("business_fax_number"),
	customerServicePhone: varchar("customer_service_phone"),
	federalTaxIdNumber: varchar("federal_tax_id_number"),
	contactName: varchar("contact_name"),
	contactPhoneNumber: varchar("contact_phone_number"),
	contactEmail: varchar("contact_email"),
	websiteAddress: varchar("website_address"),
	processingCategories: jsonb("processing_categories"),
	ownershipType: ownershipType("ownership_type"),
	principalOfficers: jsonb("principal_officers"),
	bankName: varchar("bank_name"),
	abaRoutingNumber: varchar("aba_routing_number"),
	accountName: varchar("account_name"),
	ddaNumber: varchar("dda_number"),
	feeScheduleData: jsonb("fee_schedule_data"),
	supportingInformation: jsonb("supporting_information"),
	equipmentData: jsonb("equipment_data"),
	beneficialOwners: jsonb("beneficial_owners"),
	corporateResolution: text("corporate_resolution"),
	merchantSignature: varchar("merchant_signature"),
	merchantName: varchar("merchant_name"),
	merchantTitle: varchar("merchant_title"),
	merchantDate: timestamp("merchant_date", { mode: 'string' }),
	corduroSignature: varchar("corduro_signature"),
	corduroName: varchar("corduro_name"),
	corduroTitle: varchar("corduro_title"),
	corduroDate: timestamp("corduro_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	submittedAt: timestamp("submitted_at", { mode: 'string' }),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewedBy: varchar("reviewed_by"),
	rejectionReason: text("rejection_reason"),
	lastSavedAt: timestamp("last_saved_at", { mode: 'string' }).defaultNow(),
	agreementAccepted: boolean("agreement_accepted").default(false),
	mpaSignedDate: timestamp("mpa_signed_date", { mode: 'string' }),
	salesRepName: varchar("sales_rep_name"),
	productOrServiceSold: text("product_or_service_sold"),
	dbaWebsite: varchar("dba_website"),
	multipleLocations: boolean("multiple_locations").default(false),
	legalContactName: varchar("legal_contact_name"),
	legalPhone: varchar("legal_phone"),
	legalEmail: varchar("legal_email"),
	incorporationState: varchar("incorporation_state"),
	entityStartDate: timestamp("entity_start_date", { mode: 'string' }),
	averageTicket: varchar("average_ticket"),
	highTicket: varchar("high_ticket"),
	monthlySalesVolume: varchar("monthly_sales_volume"),
	monthlyTransactions: integer("monthly_transactions"),
	annualVolume: varchar("annual_volume"),
	annualTransactions: integer("annual_transactions"),
	accountOwnerFirstName: varchar("account_owner_first_name"),
	accountOwnerLastName: varchar("account_owner_last_name"),
	nameOnBankAccount: varchar("name_on_bank_account"),
	bankOfficerName: varchar("bank_officer_name"),
	bankOfficerPhone: varchar("bank_officer_phone"),
	bankOfficerEmail: varchar("bank_officer_email"),
	ownerFullName: varchar("owner_full_name"),
	ownerFirstName: varchar("owner_first_name"),
	ownerLastName: varchar("owner_last_name"),
	ownerOfficer: varchar("owner_officer"),
	ownerTitle: varchar("owner_title"),
	ownerOwnershipPercentage: varchar("owner_ownership_percentage"),
	ownerMobilePhone: varchar("owner_mobile_phone"),
	ownerEmail: varchar("owner_email"),
	ownerSsn: varchar("owner_ssn"),
	ownerBirthday: timestamp("owner_birthday", { mode: 'string' }),
	ownerStateIssuedIdNumber: varchar("owner_state_issued_id_number"),
	ownerIdExpDate: timestamp("owner_id_exp_date", { mode: 'string' }),
	ownerIssuingState: varchar("owner_issuing_state"),
	ownerIdDateIssued: timestamp("owner_id_date_issued", { mode: 'string' }),
	ownerLegalAddress: text("owner_legal_address"),
	ownerCity: varchar("owner_city"),
	ownerState: varchar("owner_state"),
	ownerZip: varchar("owner_zip"),
	ownerCountry: varchar("owner_country").default('US'),
	financialRepresentative: jsonb("financial_representative"),
	businessType: varchar("business_type").default('Retail'),
	refundGuarantee: boolean("refund_guarantee").default(false),
	refundDays: integer("refund_days"),
	posSystem: varchar("pos_system"),
	authorizedContacts: jsonb("authorized_contacts"),
	processedCardsPast: boolean("processed_cards_past").default(false),
	previouslyProcessed: boolean("previously_processed").default(false),
	automaticBilling: boolean("automatic_billing").default(false),
	cardholderData3RdParty: boolean("cardholder_data_3rd_party").default(false),
	eSignatureStatus: text("e_signature_status").default('NOT_SENT'),
	eSignatureApplicationId: text("e_signature_application_id"),
	eSignatureSentAt: timestamp("e_signature_sent_at", { mode: 'string' }),
	eSignatureCompletedAt: timestamp("e_signature_completed_at", { mode: 'string' }),
	signedDocumentId: integer("signed_document_id"),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "merchant_applications_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "merchant_applications_reviewed_by_users_id_fk"
		}),
]);
