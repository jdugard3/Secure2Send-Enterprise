-- Add agreementAccepted column to merchant_applications table
ALTER TABLE merchant_applications 
ADD COLUMN agreement_accepted BOOLEAN DEFAULT false;

-- Update any existing records to have the default value
UPDATE merchant_applications 
SET agreement_accepted = false 
WHERE agreement_accepted IS NULL;
