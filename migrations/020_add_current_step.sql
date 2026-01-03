-- Migration: Add currentStep field to merchant_applications table
-- Date: 2025-01-XX
-- Description: Adds currentStep field to track which step (1-4) the user is currently on in the new application flow

-- Add currentStep column to merchant_applications table
ALTER TABLE merchant_applications 
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 4);

-- Add comment for documentation
COMMENT ON COLUMN merchant_applications.current_step IS 'Tracks the current step in the application flow: 1=Basic Info, 2=Documents, 3=Review, 4=Submit';

-- Update existing draft applications to have current_step = 1
UPDATE merchant_applications 
SET current_step = 1 
WHERE current_step IS NULL AND status = 'DRAFT';

-- Update submitted applications to have current_step = 4 (completed)
UPDATE merchant_applications 
SET current_step = 4 
WHERE current_step IS NULL AND status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

