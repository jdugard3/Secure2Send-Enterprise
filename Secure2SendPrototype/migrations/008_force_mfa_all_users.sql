-- Force MFA setup for ALL users who don't have it enabled
-- This makes MFA mandatory for everyone, including existing users

UPDATE users 
SET mfa_required = TRUE 
WHERE mfa_enabled = FALSE;

-- Optional: Add a comment for clarity
COMMENT ON COLUMN users.mfa_required IS 'When TRUE, user must complete MFA setup before accessing the application';
