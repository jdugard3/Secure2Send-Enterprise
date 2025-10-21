-- Migration: Add Email MFA Support
-- This migration adds email-based MFA as a complementary method to TOTP
-- Users can have TOTP, Email, or both methods enabled

-- Add email MFA columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_email_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_email_otp TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_email_otp_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_email_otp_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_email_last_sent_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_email_send_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_email_rate_limit_reset_at TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN users.mfa_email_enabled IS 'Whether email-based MFA is enabled for this user';
COMMENT ON COLUMN users.mfa_email_otp IS 'Hashed email OTP code (temporary, cleared after use)';
COMMENT ON COLUMN users.mfa_email_otp_expires_at IS 'Expiration timestamp for email OTP (5 minutes from creation)';
COMMENT ON COLUMN users.mfa_email_otp_attempts IS 'Number of failed OTP verification attempts (max 5)';
COMMENT ON COLUMN users.mfa_email_last_sent_at IS 'Timestamp of last email OTP sent (for rate limiting)';
COMMENT ON COLUMN users.mfa_email_send_count IS 'Number of OTPs sent in current rate limit window';
COMMENT ON COLUMN users.mfa_email_rate_limit_reset_at IS 'When the rate limit counter resets (15 minutes)';

-- Add new audit log actions for email MFA
DO $$ 
BEGIN
  -- Check if the enum type needs updating
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'MFA_EMAIL_ENABLED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'MFA_EMAIL_ENABLED';
    ALTER TYPE audit_action ADD VALUE 'MFA_EMAIL_DISABLED';
    ALTER TYPE audit_action ADD VALUE 'MFA_EMAIL_OTP_SENT';
    ALTER TYPE audit_action ADD VALUE 'MFA_EMAIL_OTP_VERIFIED';
    ALTER TYPE audit_action ADD VALUE 'MFA_EMAIL_OTP_FAILED';
    ALTER TYPE audit_action ADD VALUE 'MFA_EMAIL_RATE_LIMIT_EXCEEDED';
    ALTER TYPE audit_action ADD VALUE 'MFA_METHOD_SWITCHED';
  END IF;
END $$;

-- Create index for faster OTP lookups during login
CREATE INDEX IF NOT EXISTS idx_users_mfa_email_otp ON users(id) WHERE mfa_email_enabled = TRUE;

-- Update existing users with mfa_enabled to have email opt-in available
-- (They'll keep TOTP and can optionally add email later)
UPDATE users SET mfa_email_enabled = FALSE WHERE mfa_email_enabled IS NULL;

