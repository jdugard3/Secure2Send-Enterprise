-- Add field to track if MFA setup is required for new users
ALTER TABLE users 
ADD COLUMN mfa_required BOOLEAN DEFAULT TRUE;

-- Set existing users to not require MFA (grandfathered in)
UPDATE users SET mfa_required = FALSE WHERE mfa_enabled = FALSE;

-- Users who already have MFA enabled don't need to be forced to set it up again
UPDATE users SET mfa_required = FALSE WHERE mfa_enabled = TRUE;
