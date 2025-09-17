-- Migration: Add merchant applications table
-- Date: 2025-01-16

-- Create new enums
CREATE TYPE merchant_application_status AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE ownership_type AS ENUM ('NON_PROFIT', 'SOLE_PROPRIETORSHIP', 'GOVERNMENT', 'PERSONAL', 'PARTNERSHIP_LLP', 'FINANCIAL_INSTITUTION', 'CORPORATION_PUBLICLY_TRADED', 'CORPORATION_PRIVATELY_HELD', 'LLC', 'S_CORP');
CREATE TYPE processing_category AS ENUM ('MOBILE', 'CARD_NOT_PRESENT_E_COMMERCE', 'CARD_PRESENT_RETAIL', 'MAIL_ORDER_TELEPHONE_MOTO', 'OTHER');

-- Add new audit actions
ALTER TYPE audit_action ADD VALUE 'MERCHANT_APPLICATION_CREATE';
ALTER TYPE audit_action ADD VALUE 'MERCHANT_APPLICATION_UPDATE';
ALTER TYPE audit_action ADD VALUE 'MERCHANT_APPLICATION_SUBMIT';
ALTER TYPE audit_action ADD VALUE 'MERCHANT_APPLICATION_REVIEW';

-- Create merchant applications table
CREATE TABLE merchant_applications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR NOT NULL REFERENCES clients(id),
  status merchant_application_status DEFAULT 'DRAFT',
  
  -- Business Information
  legal_business_name VARCHAR,
  dba_business_name VARCHAR,
  billing_address TEXT,
  location_address TEXT,
  city VARCHAR,
  state VARCHAR,
  zip VARCHAR,
  business_phone VARCHAR,
  business_fax_number VARCHAR,
  customer_service_phone VARCHAR,
  federal_tax_id_number VARCHAR,
  contact_name VARCHAR,
  contact_phone_number VARCHAR,
  contact_email VARCHAR,
  website_address VARCHAR,
  
  -- Business Description
  processing_categories JSONB, -- Array of selected categories
  ownership_type ownership_type,
  
  -- Owner/Principal Officers (stored as JSON array)
  principal_officers JSONB,
  
  -- Settlement/Banking
  bank_name VARCHAR,
  aba_routing_number VARCHAR,
  account_name VARCHAR,
  dda_number VARCHAR,
  
  -- Fee Schedule Information
  fee_schedule_data JSONB,
  
  -- Supporting Information
  supporting_information JSONB,
  
  -- Equipment Information
  equipment_data JSONB,
  
  -- Beneficial Ownership (stored as JSON array)
  beneficial_owners JSONB,
  
  -- Corporate Resolution and Certification
  corporate_resolution TEXT,
  merchant_signature VARCHAR,
  merchant_name VARCHAR,
  merchant_title VARCHAR,
  merchant_date TIMESTAMP,
  corduro_signature VARCHAR,
  corduro_name VARCHAR,
  corduro_title VARCHAR,
  corduro_date TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR REFERENCES users(id),
  rejection_reason TEXT,
  
  -- Auto-save tracking
  last_saved_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_merchant_applications_client_id ON merchant_applications(client_id);
CREATE INDEX idx_merchant_applications_status ON merchant_applications(status);
CREATE INDEX idx_merchant_applications_created_at ON merchant_applications(created_at);
CREATE INDEX idx_merchant_applications_submitted_at ON merchant_applications(submitted_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_merchant_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_merchant_applications_updated_at
    BEFORE UPDATE ON merchant_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_applications_updated_at();

-- Add trigger to update last_saved_at timestamp
CREATE OR REPLACE FUNCTION update_merchant_applications_last_saved_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_saved_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_merchant_applications_last_saved_at
    BEFORE UPDATE ON merchant_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_applications_last_saved_at();
