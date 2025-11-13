-- Migration: Add indexes for email MFA performance and add any missing fields
-- This ensures optimal performance for OTP verification and rate limiting

-- Add indexes for email MFA operations
CREATE INDEX IF NOT EXISTS idx_users_mfa_email_otp_expires 
  ON users(mfa_email_otp_expires_at) 
  WHERE mfa_email_otp_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_mfa_email_last_sent 
  ON users(mfa_email_last_sent_at) 
  WHERE mfa_email_last_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_mfa_email_enabled 
  ON users(mfa_email_enabled) 
  WHERE mfa_email_enabled = true;

-- Add indexes for combined MFA status queries
CREATE INDEX IF NOT EXISTS idx_users_mfa_status 
  ON users(mfa_enabled, mfa_email_enabled, mfa_required);

-- Ensure all email MFA columns exist (they should from schema, but this is a safety check)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'mfa_email_enabled') THEN
    ALTER TABLE users ADD COLUMN mfa_email_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'mfa_email_otp') THEN
    ALTER TABLE users ADD COLUMN mfa_email_otp TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'mfa_email_otp_expires_at') THEN
    ALTER TABLE users ADD COLUMN mfa_email_otp_expires_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'mfa_email_otp_attempts') THEN
    ALTER TABLE users ADD COLUMN mfa_email_otp_attempts INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'mfa_email_last_sent_at') THEN
    ALTER TABLE users ADD COLUMN mfa_email_last_sent_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'mfa_email_send_count') THEN
    ALTER TABLE users ADD COLUMN mfa_email_send_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'mfa_email_rate_limit_reset_at') THEN
    ALTER TABLE users ADD COLUMN mfa_email_rate_limit_reset_at TIMESTAMP;
  END IF;
END $$;

-- Add comment explaining the email MFA fields
COMMENT ON COLUMN users.mfa_email_enabled IS 'Whether email-based MFA is enabled for this user';
COMMENT ON COLUMN users.mfa_email_otp IS 'Hashed OTP code sent to user email (expires after 5 minutes)';
COMMENT ON COLUMN users.mfa_email_otp_expires_at IS 'Expiration timestamp for the current OTP (5 minutes from send)';
COMMENT ON COLUMN users.mfa_email_otp_attempts IS 'Number of failed OTP verification attempts (max 5)';
COMMENT ON COLUMN users.mfa_email_last_sent_at IS 'Timestamp of last OTP email sent';
COMMENT ON COLUMN users.mfa_email_send_count IS 'Number of OTP emails sent in current rate limit window';
COMMENT ON COLUMN users.mfa_email_rate_limit_reset_at IS 'When the rate limit counter resets (15 minutes from first send)';

