-- Add new audit log actions for delete operations
-- Note: PostgreSQL ENUM types require special handling for adding values

-- Add MERCHANT_APPLICATION_DELETE action
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'MERCHANT_APPLICATION_DELETE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'MERCHANT_APPLICATION_DELETE';
  END IF;
END$$;

-- Add INVITATION_CODE_DELETED action
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'INVITATION_CODE_DELETED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'INVITATION_CODE_DELETED';
  END IF;
END$$;
