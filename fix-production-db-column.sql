-- Add merchant_application_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'merchant_application_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN merchant_application_id VARCHAR;
        ALTER TABLE documents ADD CONSTRAINT documents_merchant_application_id_fkey 
          FOREIGN KEY (merchant_application_id) REFERENCES merchant_applications(id);
        CREATE INDEX idx_documents_merchant_application_id ON documents(merchant_application_id);
        RAISE NOTICE 'Added merchant_application_id column to documents table';
    ELSE
        RAISE NOTICE 'merchant_application_id column already exists';
    END IF;
END $$;
