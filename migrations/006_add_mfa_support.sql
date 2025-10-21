-- Add MFA support to users table
ALTER TABLE users 
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_secret TEXT,
ADD COLUMN mfa_backup_codes TEXT[], -- Array of hashed backup codes
ADD COLUMN mfa_setup_at TIMESTAMP,
ADD COLUMN mfa_last_used TIMESTAMP;

-- Add MFA-related audit log actions
ALTER TYPE audit_action ADD VALUE 'MFA_ENABLED';
ALTER TYPE audit_action ADD VALUE 'MFA_DISABLED';
ALTER TYPE audit_action ADD VALUE 'MFA_BACKUP_CODE_USED';
ALTER TYPE audit_action ADD VALUE 'MFA_SETUP_COMPLETED';
ALTER TYPE audit_action ADD VALUE 'MFA_VERIFICATION_FAILED';
ALTER TYPE audit_action ADD VALUE 'MFA_VERIFICATION_SUCCESS';

-- Add index for MFA queries
CREATE INDEX idx_users_mfa_enabled ON users(mfa_enabled) WHERE mfa_enabled = TRUE;
