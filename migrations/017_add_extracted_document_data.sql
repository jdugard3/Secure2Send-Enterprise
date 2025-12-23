-- Migration: Add Extracted Document Data Table for OCR
-- Date: 2025-12-21
-- Description: Creates table to store OCR-extracted document data with public (masked) and encrypted fields

-- Create extracted_document_data table
CREATE TABLE IF NOT EXISTS extracted_document_data (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  document_id VARCHAR REFERENCES documents(id) ON DELETE CASCADE,
  merchant_application_id VARCHAR REFERENCES merchant_applications(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Public (masked) data for UI display
  extracted_data_public JSONB NOT NULL,
  
  -- Encrypted sensitive fields (JSONB object with encrypted values)
  encrypted_fields JSONB NOT NULL,
  
  -- Document tracking
  document_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for duplicate detection
  extraction_timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  confidence_score VARCHAR, -- Stored as string to preserve precision (0.00-1.00)
  
  -- User review tracking
  user_reviewed BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMP,
  applied_to_application BOOLEAN DEFAULT false,
  applied_at TIMESTAMP,
  
  -- Auto-expiry (30 days default)
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Audit fields for compliance
  processing_ip_address VARCHAR(45), -- IPv6 support
  processing_user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_extracted_document_data_document_id ON extracted_document_data(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_document_data_merchant_app_id ON extracted_document_data(merchant_application_id);
CREATE INDEX IF NOT EXISTS idx_extracted_document_data_user_id ON extracted_document_data(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_document_data_document_hash ON extracted_document_data(document_hash);
CREATE INDEX IF NOT EXISTS idx_extracted_document_data_expires_at ON extracted_document_data(expires_at);
CREATE INDEX IF NOT EXISTS idx_extracted_document_data_user_reviewed ON extracted_document_data(user_reviewed);
CREATE INDEX IF NOT EXISTS idx_extracted_document_data_applied ON extracted_document_data(applied_to_application);

-- Add OCR-related audit actions to audit_action enum
DO $$ BEGIN
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'OCR_EXTRACTION_STARTED';
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'OCR_EXTRACTION_COMPLETED';
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'OCR_EXTRACTION_FAILED';
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'OCR_DATA_REVIEWED';
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'OCR_DATA_APPLIED';
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'OCR_DATA_DECRYPTED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add comments for documentation
COMMENT ON TABLE extracted_document_data IS 'Stores OCR-extracted data from documents with public (masked) and encrypted sensitive fields';
COMMENT ON COLUMN extracted_document_data.extracted_data_public IS 'Public (masked) data safe for UI display without MFA';
COMMENT ON COLUMN extracted_document_data.encrypted_fields IS 'JSONB object containing encrypted sensitive fields (SSN, Tax ID, Account Numbers, etc.)';
COMMENT ON COLUMN extracted_document_data.document_hash IS 'SHA-256 hash of document for duplicate detection';
COMMENT ON COLUMN extracted_document_data.confidence_score IS 'OCR confidence score (0.00-1.00) as string';
COMMENT ON COLUMN extracted_document_data.expires_at IS 'Auto-delete unreviewed data after 30 days for compliance';
COMMENT ON COLUMN extracted_document_data.user_reviewed IS 'Whether user has reviewed the extracted data';
COMMENT ON COLUMN extracted_document_data.applied_to_application IS 'Whether reviewed data has been applied to merchant application';

