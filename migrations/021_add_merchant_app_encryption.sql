-- Migration: Add encryption support for merchant applications
-- This migration adds columns to support field-level encryption for PII data

-- Add encryption tracking columns to merchant_applications table
ALTER TABLE merchant_applications 
  ADD COLUMN IF NOT EXISTS encrypted_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS has_encrypted_data BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP;

-- Create index for querying encrypted records (useful for migration tracking)
CREATE INDEX IF NOT EXISTS idx_merchant_applications_encrypted 
  ON merchant_applications(has_encrypted_data);

-- Create index for encrypted_at to help with audit queries
CREATE INDEX IF NOT EXISTS idx_merchant_applications_encrypted_at 
  ON merchant_applications(encrypted_at);

-- Add new audit log actions for encryption events
-- First check if the values already exist in the enum
DO $$
BEGIN
  -- Add MERCHANT_APP_ENCRYPTED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'MERCHANT_APP_ENCRYPTED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'MERCHANT_APP_ENCRYPTED';
  END IF;
  
  -- Add MERCHANT_APP_DECRYPTED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'MERCHANT_APP_DECRYPTED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'MERCHANT_APP_DECRYPTED';
  END IF;
  
  -- Add MERCHANT_APP_PII_ACCESSED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'MERCHANT_APP_PII_ACCESSED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'MERCHANT_APP_PII_ACCESSED';
  END IF;
  
  -- Add ENCRYPTION_KEY_ROTATED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ENCRYPTION_KEY_ROTATED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'ENCRYPTION_KEY_ROTATED';
  END IF;
  
  -- Add DECRYPTION_FAILURE if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'DECRYPTION_FAILURE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'DECRYPTION_FAILURE';
  END IF;
END $$;

-- Comment on the new columns for documentation
COMMENT ON COLUMN merchant_applications.encrypted_fields IS 'JSON object containing AES-256-GCM encrypted sensitive PII fields';
COMMENT ON COLUMN merchant_applications.has_encrypted_data IS 'Flag indicating whether this record has encrypted PII data';
COMMENT ON COLUMN merchant_applications.encrypted_at IS 'Timestamp when the data was encrypted';
