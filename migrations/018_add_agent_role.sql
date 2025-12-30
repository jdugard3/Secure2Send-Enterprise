-- Migration: Add AGENT role to user_role enum
-- Date: 2025-01-XX
-- Description: Adds AGENT role to support Agent Portal functionality for merchant onboarding assistance

-- Add AGENT value to user_role enum
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AGENT';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add comments for documentation
COMMENT ON TYPE user_role IS 'User role types: ADMIN (system administrators), CLIENT (merchants/users), AGENT (onboarding assistance agents)';

