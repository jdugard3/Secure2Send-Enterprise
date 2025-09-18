-- Migration: Add IRIS CRM integration support
-- Add leadId field to clients table for IRIS CRM integration

ALTER TABLE clients ADD COLUMN iris_lead_id VARCHAR;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_iris_lead_id ON clients(iris_lead_id);

-- Add comment for documentation
COMMENT ON COLUMN clients.iris_lead_id IS 'IRIS CRM lead ID for integration tracking';
