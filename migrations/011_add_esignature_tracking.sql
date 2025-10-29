-- Add e-signature tracking fields to merchant applications table
ALTER TABLE merchant_applications 
ADD COLUMN e_signature_status TEXT DEFAULT 'NOT_SENT' CHECK (e_signature_status IN ('NOT_SENT', 'PENDING', 'SIGNED', 'DECLINED', 'EXPIRED')),
ADD COLUMN e_signature_application_id TEXT,
ADD COLUMN e_signature_sent_at TIMESTAMP,
ADD COLUMN e_signature_completed_at TIMESTAMP,
ADD COLUMN signed_document_id INTEGER REFERENCES documents(id);

-- Create index for faster lookups by e-signature application ID
CREATE INDEX IF NOT EXISTS idx_merchant_applications_esignature_app_id 
ON merchant_applications(e_signature_application_id) 
WHERE e_signature_application_id IS NOT NULL;

-- Create index for tracking pending signatures
CREATE INDEX IF NOT EXISTS idx_merchant_applications_esignature_status 
ON merchant_applications(e_signature_status) 
WHERE e_signature_status != 'NOT_SENT';

