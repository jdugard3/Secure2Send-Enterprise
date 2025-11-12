-- Add new audit action enum values for invitation codes
-- Note: ALTER TYPE ADD VALUE cannot be run in a transaction, so we check if values exist first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INVITATION_CODE_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
        ALTER TYPE audit_action ADD VALUE 'INVITATION_CODE_CREATED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INVITATION_CODE_USED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
        ALTER TYPE audit_action ADD VALUE 'INVITATION_CODE_USED';
    END IF;
END $$;

-- Create invitation code status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_code_status') THEN
        CREATE TYPE invitation_code_status AS ENUM ('ACTIVE', 'USED', 'EXPIRED');
    END IF;
END $$;

-- Create invitation codes table for merchant onboarding
CREATE TABLE IF NOT EXISTS invitation_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,
  label VARCHAR NOT NULL,
  status invitation_code_status DEFAULT 'ACTIVE',
  created_by VARCHAR NOT NULL REFERENCES users(id),
  used_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP
);

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_status ON invitation_codes(status);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_created_by ON invitation_codes(created_by);

