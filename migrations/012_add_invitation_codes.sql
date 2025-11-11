-- Create invitation codes table for merchant onboarding
CREATE TABLE IF NOT EXISTS invitation_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,
  label VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED')),
  created_by VARCHAR NOT NULL REFERENCES users(id),
  used_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP
);

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_status ON invitation_codes(status);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_created_by ON invitation_codes(created_by);

