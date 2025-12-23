# Phase 3 Complete: Database Schema Updates

## ✅ What Was Added

### 1. New Table: `extracted_document_data`

Stores OCR-extracted document data with proper security and tracking:

```sql
CREATE TABLE extracted_document_data (
  id VARCHAR PRIMARY KEY,
  
  -- Foreign keys
  document_id VARCHAR REFERENCES documents(id) ON DELETE CASCADE,
  merchant_application_id VARCHAR REFERENCES merchant_applications(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Data storage
  extracted_data_public JSONB NOT NULL,  -- Masked data for UI
  encrypted_fields JSONB NOT NULL,       -- Encrypted sensitive fields
  
  -- Tracking
  document_hash VARCHAR(64) NOT NULL,    -- SHA-256 for duplicate detection
  extraction_timestamp TIMESTAMP DEFAULT NOW(),
  confidence_score VARCHAR,              -- 0.00-1.00 as string
  
  -- Review tracking
  user_reviewed BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMP,
  applied_to_application BOOLEAN DEFAULT false,
  applied_at TIMESTAMP,
  
  -- Auto-expiry
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Audit
  processing_ip_address VARCHAR(45),
  processing_user_agent TEXT
);
```

### 2. Indexes Created

For optimal query performance:

- `idx_extracted_document_data_document_id` - Find by document
- `idx_extracted_document_data_merchant_app_id` - Find by application
- `idx_extracted_document_data_user_id` - Find by user
- `idx_extracted_document_data_document_hash` - Duplicate detection
- `idx_extracted_document_data_expires_at` - Cleanup queries
- `idx_extracted_document_data_user_reviewed` - Filter by review status
- `idx_extracted_document_data_applied` - Filter by applied status

### 3. Audit Actions Added

New audit log actions for OCR operations:

- `OCR_EXTRACTION_STARTED`
- `OCR_EXTRACTION_COMPLETED`
- `OCR_EXTRACTION_FAILED`
- `OCR_DATA_REVIEWED`
- `OCR_DATA_APPLIED`
- `OCR_DATA_DECRYPTED`

### 4. Relations Added

- `documents.extractedData` - Many extracted data per document
- `merchantApplications.extractedData` - Many extracted data per application
- `users.extractedDocumentData` - Many extracted data per user
- `extractedDocumentData.document` - Document reference
- `extractedDocumentData.merchantApplication` - Application reference
- `extractedDocumentData.user` - User reference

## 📋 Data Structure

### `extracted_data_public` (JSONB)

Contains masked data safe for UI display:

```json
{
  "legalBusinessName": "Acme Corporation LLC",
  "federalTaxIdNumber": "**-****6789",
  "signerSSN": "***-**-6789",
  "routingNumber": "*****6789",
  "accountNumber": "****3210",
  "dob": "****-**-**",
  "confidence": 0.95
}
```

### `encrypted_fields` (JSONB)

Contains encrypted sensitive values:

```json
{
  "signerSSN": "encrypted_base64_string...",
  "federalTaxIdNumber": "encrypted_base64_string...",
  "routingNumber": "encrypted_base64_string...",
  "accountNumber": "encrypted_base64_string...",
  "dob": "encrypted_base64_string...",
  "owners.0.ssn": "encrypted_base64_string...",
  "owners.1.ssn": "encrypted_base64_string..."
}
```

## 🔒 Security Features

1. **Separate Storage**: Public (masked) and encrypted data stored separately
2. **Cascade Deletes**: Data deleted when document/application/user is deleted
3. **Auto-Expiry**: Unreviewed data expires after 30 days
4. **Audit Tracking**: IP address and user agent logged for compliance
5. **Document Hashing**: SHA-256 hash for duplicate detection

## 📊 Workflow

1. **Document Upload** → OCR processes → Data extracted
2. **PII Protection** → Separate into public (masked) + encrypted
3. **Storage** → Save to `extracted_document_data` table
4. **User Review** → User reviews masked data → `user_reviewed = true`
5. **Apply Data** → User confirms → Apply to application → `applied_to_application = true`
6. **Cleanup** → Unreviewed data deleted after 30 days

## 🧪 Testing

The schema has been pushed to the database. Verify with:

```sql
-- Check table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'extracted_document_data';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'extracted_document_data';

-- Check structure
\d extracted_document_data
```

## ✅ Phase 3 Complete

- ✅ Table created with all required fields
- ✅ Indexes added for performance
- ✅ Relations configured
- ✅ Audit actions added
- ✅ Migration file created
- ✅ Auto-expiry configured (30 days)
- ✅ Cascade deletes configured

**Ready for Phase 4: API Endpoints!** 🚀

