-- Add irisLeadId to merchant_applications table
-- Each merchant application gets its own IRIS CRM lead
ALTER TABLE merchant_applications ADD COLUMN iris_lead_id VARCHAR;

-- Add merchantApplicationId to documents table
-- Documents are now linked to specific merchant applications
ALTER TABLE documents ADD COLUMN merchant_application_id VARCHAR;

-- Add foreign key constraint for merchant application relationship
ALTER TABLE documents ADD CONSTRAINT documents_merchant_application_id_fkey 
  FOREIGN KEY (merchant_application_id) REFERENCES merchant_applications(id);

-- Add index for faster lookups
CREATE INDEX idx_documents_merchant_application_id ON documents(merchant_application_id);
CREATE INDEX idx_merchant_applications_iris_lead_id ON merchant_applications(iris_lead_id);

