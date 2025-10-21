-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."audit_action" AS ENUM('USER_LOGIN', 'USER_LOGOUT', 'DOCUMENT_UPLOAD', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_APPROVE', 'DOCUMENT_REJECT', 'DOCUMENT_DELETE', 'CLIENT_STATUS_UPDATE', 'ADMIN_IMPERSONATE_START', 'ADMIN_IMPERSONATE_END', 'SENSITIVE_DATA_ACCESS', 'SENSITIVE_DATA_UPDATE', 'FILE_DOWNLOAD', 'MERCHANT_APPLICATION_CREATE', 'MERCHANT_APPLICATION_UPDATE', 'MERCHANT_APPLICATION_SUBMIT', 'MERCHANT_APPLICATION_REVIEW', 'MFA_ENABLED', 'MFA_DISABLED', 'MFA_BACKUP_CODE_USED', 'MFA_SETUP_COMPLETED', 'MFA_VERIFICATION_FAILED', 'MFA_VERIFICATION_SUCCESS');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'INCOMPLETE');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('SS4_EIN_LETTER', 'W9', 'BENEFICIAL_OWNERSHIP', 'DRIVERS_LICENSE', 'PASSPORT', 'CANNABIS_LICENSE', 'SEED_TO_SALE_INFO', 'POS_INFO', 'BANKING_INFO', 'BANK_STATEMENTS', 'ARTICLES_OF_INCORPORATION', 'OPERATING_AGREEMENT', 'BUSINESS_LICENSE', 'VOIDED_CHECK', 'COA_PRODUCTS', 'PROVIDER_CONTRACT', 'INSURANCE_COVERAGE');--> statement-breakpoint
CREATE TYPE "public"."merchant_application_status" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."ownership_type" AS ENUM('NON_PROFIT', 'SOLE_PROPRIETORSHIP', 'GOVERNMENT', 'PERSONAL', 'PARTNERSHIP_LLP', 'FINANCIAL_INSTITUTION', 'CORPORATION_PUBLICLY_TRADED', 'CORPORATION_PRIVATELY_HELD', 'LLC', 'S_CORP');--> statement-breakpoint
CREATE TYPE "public"."processing_category" AS ENUM('MOBILE', 'CARD_NOT_PRESENT_E_COMMERCE', 'CARD_PRESENT_RETAIL', 'MAIL_ORDER_TELEPHONE_MOTO', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'CLIENT');--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"company_name" varchar,
	"role" "user_role" DEFAULT 'CLIENT',
	"email_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"mfa_enabled" boolean DEFAULT false,
	"mfa_secret" text,
	"mfa_backup_codes" text[],
	"mfa_setup_at" timestamp,
	"mfa_last_used" timestamp,
	"mfa_required" boolean DEFAULT true,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action" "audit_action" NOT NULL,
	"resource_type" varchar,
	"resource_id" varchar,
	"details" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar NOT NULL,
	"original_name" varchar NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar NOT NULL,
	"file_path" text NOT NULL,
	"document_type" "document_type" NOT NULL,
	"status" "document_status" DEFAULT 'PENDING',
	"rejection_reason" text,
	"client_id" varchar NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"r2_key" text,
	"r2_url" text,
	"encryption_key_id" varchar
);
--> statement-breakpoint
CREATE TABLE "sensitive_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"ssn" text,
	"bank_account_number" text,
	"routing_number" text,
	"tax_id" text,
	"encrypted_at" timestamp DEFAULT now(),
	"last_accessed" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"status" "client_status" DEFAULT 'PENDING',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"iris_lead_id" varchar
);
--> statement-breakpoint
CREATE TABLE "merchant_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"status" "merchant_application_status" DEFAULT 'DRAFT',
	"legal_business_name" varchar,
	"dba_business_name" varchar,
	"billing_address" text,
	"location_address" text,
	"city" varchar,
	"state" varchar,
	"zip" varchar,
	"business_phone" varchar,
	"business_fax_number" varchar,
	"customer_service_phone" varchar,
	"federal_tax_id_number" varchar,
	"contact_name" varchar,
	"contact_phone_number" varchar,
	"contact_email" varchar,
	"website_address" varchar,
	"processing_categories" jsonb,
	"ownership_type" "ownership_type",
	"principal_officers" jsonb,
	"bank_name" varchar,
	"aba_routing_number" varchar,
	"account_name" varchar,
	"dda_number" varchar,
	"fee_schedule_data" jsonb,
	"supporting_information" jsonb,
	"equipment_data" jsonb,
	"beneficial_owners" jsonb,
	"corporate_resolution" text,
	"merchant_signature" varchar,
	"merchant_name" varchar,
	"merchant_title" varchar,
	"merchant_date" timestamp,
	"corduro_signature" varchar,
	"corduro_name" varchar,
	"corduro_title" varchar,
	"corduro_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"rejection_reason" text,
	"last_saved_at" timestamp DEFAULT now(),
	"agreement_accepted" boolean DEFAULT false,
	"mpa_signed_date" timestamp,
	"sales_rep_name" varchar,
	"product_or_service_sold" text,
	"dba_website" varchar,
	"multiple_locations" boolean DEFAULT false,
	"legal_contact_name" varchar,
	"legal_phone" varchar,
	"legal_email" varchar,
	"incorporation_state" varchar,
	"entity_start_date" timestamp,
	"average_ticket" varchar,
	"high_ticket" varchar,
	"monthly_sales_volume" varchar,
	"monthly_transactions" integer,
	"annual_volume" varchar,
	"annual_transactions" integer,
	"account_owner_first_name" varchar,
	"account_owner_last_name" varchar,
	"name_on_bank_account" varchar,
	"bank_officer_name" varchar,
	"bank_officer_phone" varchar,
	"bank_officer_email" varchar,
	"owner_full_name" varchar,
	"owner_first_name" varchar,
	"owner_last_name" varchar,
	"owner_officer" varchar,
	"owner_title" varchar,
	"owner_ownership_percentage" varchar,
	"owner_mobile_phone" varchar,
	"owner_email" varchar,
	"owner_ssn" varchar,
	"owner_birthday" timestamp,
	"owner_state_issued_id_number" varchar,
	"owner_id_exp_date" timestamp,
	"owner_issuing_state" varchar,
	"owner_id_date_issued" timestamp,
	"owner_legal_address" text,
	"owner_city" varchar,
	"owner_state" varchar,
	"owner_zip" varchar,
	"owner_country" varchar DEFAULT 'US',
	"financial_representative" jsonb,
	"business_type" varchar DEFAULT 'Retail',
	"refund_guarantee" boolean DEFAULT false,
	"refund_days" integer,
	"pos_system" varchar,
	"authorized_contacts" jsonb,
	"processed_cards_past" boolean DEFAULT false,
	"previously_processed" boolean DEFAULT false,
	"automatic_billing" boolean DEFAULT false,
	"cardholder_data_3rd_party" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensitive_data" ADD CONSTRAINT "sensitive_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensitive_data" ADD CONSTRAINT "sensitive_data_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_applications" ADD CONSTRAINT "merchant_applications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_applications" ADD CONSTRAINT "merchant_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire" timestamp_ops);
*/