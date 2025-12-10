-- Add onboarding progress tracking to users table
-- Values: PART1, DOCUMENTS, PART2, REVIEW, COMPLETE

-- Create enum for onboarding step
DO $$ BEGIN
  CREATE TYPE onboarding_step AS ENUM ('PART1', 'DOCUMENTS', 'PART2', 'REVIEW', 'COMPLETE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add onboarding_step column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step onboarding_step DEFAULT 'PART1';

-- Add index for querying users by onboarding step
CREATE INDEX IF NOT EXISTS idx_users_onboarding_step ON users(onboarding_step);

-- Comment for documentation
COMMENT ON COLUMN users.onboarding_step IS 'Tracks user progress through onboarding flow: PART1 (basic business info), DOCUMENTS (upload required docs), PART2 (detailed business info), REVIEW (review and submit), COMPLETE (submitted/approved)';




