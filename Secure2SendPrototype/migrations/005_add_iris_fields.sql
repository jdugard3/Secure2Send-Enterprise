-- Migration: Add IRIS CRM required fields to merchant applications
-- Date: 2025-01-16

-- Add new required fields for IRIS CRM integration
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS mpa_signed_date DATE;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS sales_rep_name VARCHAR;

-- DBA Information enhancements
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS product_or_service_sold TEXT;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS dba_website VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS multiple_locations BOOLEAN DEFAULT false;

-- Corporate Information enhancements  
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS legal_contact_name VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS legal_phone VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS legal_email VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS incorporation_state VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS entity_start_date DATE;

-- Transaction and Volume fields
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS average_ticket DECIMAL(10,2);
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS high_ticket DECIMAL(10,2);
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS monthly_sales_volume DECIMAL(12,2);
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS monthly_transactions INTEGER;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS annual_volume DECIMAL(12,2);
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS annual_transactions INTEGER;

-- Enhanced Banking Information
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS account_owner_first_name VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS account_owner_last_name VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS name_on_bank_account VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS bank_officer_name VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS bank_officer_phone VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS bank_officer_email VARCHAR;

-- Enhanced Owner Information
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_full_name VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_first_name VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_last_name VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_officer VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_title VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_ownership_percentage DECIMAL(5,2);
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_mobile_phone VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_email VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_ssn VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_birthday DATE;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_state_issued_id_number VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_id_exp_date DATE;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_issuing_state VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_id_date_issued DATE;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_legal_address TEXT;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_city VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_state VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_zip VARCHAR;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS owner_country VARCHAR DEFAULT 'US';

-- Financial Representative (stored as JSONB for complex structure)
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS financial_representative JSONB;

-- Business Operations
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS business_type VARCHAR DEFAULT 'Retail';
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS refund_guarantee BOOLEAN DEFAULT false;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS refund_days INTEGER;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS pos_system VARCHAR;

-- Enhanced Beneficial Ownership fields (will extend existing JSONB)
-- These will be handled in the beneficialOwners JSONB field with additional properties

-- Authorized Contacts (stored as JSONB)
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS authorized_contacts JSONB;

-- Auto-filled fields for IRIS integration
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS processed_cards_past BOOLEAN DEFAULT false;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS previously_processed BOOLEAN DEFAULT false;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS automatic_billing BOOLEAN DEFAULT false;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS cardholder_data_3rd_party BOOLEAN DEFAULT false;

-- Add indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_merchant_applications_mpa_signed_date ON merchant_applications(mpa_signed_date);
CREATE INDEX IF NOT EXISTS idx_merchant_applications_business_type ON merchant_applications(business_type);
CREATE INDEX IF NOT EXISTS idx_merchant_applications_monthly_sales_volume ON merchant_applications(monthly_sales_volume);

-- Update the trigger to handle new timestamp fields
-- The existing triggers will continue to work for updated_at and last_saved_at
