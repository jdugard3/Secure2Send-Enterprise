-- Migration: Add Security Features for SOC 2 Compliance
-- Date: 2024-12-19
-- Description: Adds R2 fields to documents table, creates sensitive_data table, and audit_logs table

-- Add R2 fields to documents table
ALTER TABLE documents 
ADD COLUMN r2_key TEXT,
ADD COLUMN r2_url TEXT,
ADD COLUMN encryption_key_id VARCHAR;

-- Create sensitive_data table for encrypted PII
CREATE TABLE IF NOT EXISTS sensitive_data (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ssn TEXT,
  bank_account_number TEXT,
  routing_number TEXT,
  tax_id TEXT,
  encrypted_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW()
);

-- Create audit_action enum type
DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
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
      'FILE_DOWNLOAD'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  resource_type VARCHAR,
  resource_id VARCHAR,
  details JSONB,
  ip_address VARCHAR,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_sensitive_data_client ON sensitive_data(client_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_data_user ON sensitive_data(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_r2_key ON documents(r2_key) WHERE r2_key IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE sensitive_data IS 'Stores encrypted sensitive PII data for compliance';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for SOC 2 compliance';
COMMENT ON COLUMN documents.r2_key IS 'Cloudflare R2 object key for secure file storage';
COMMENT ON COLUMN documents.r2_url IS 'Public URL for R2 stored files';
COMMENT ON COLUMN documents.encryption_key_id IS 'Reference to encryption key used for file';

-- Update existing documents to have NULL values for new fields (already done by ALTER TABLE)
-- This ensures backward compatibility

COMMIT;
