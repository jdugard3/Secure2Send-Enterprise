# Phase 4 Complete: API Endpoints

## ✅ What Was Added

### 1. Storage Methods

Added methods to `server/storage.ts` for extracted document data operations:

- `createExtractedDocumentData()` - Create new extracted data record
- `getExtractedDocumentDataById()` - Get by ID
- `getExtractedDocumentDataByDocumentId()` - Get by document ID
- `getExtractedDocumentDataByMerchantApplicationId()` - Get all for an application
- `getExtractedDocumentDataByUserId()` - Get all for a user
- `updateExtractedDocumentDataReviewed()` - Mark as reviewed
- `updateExtractedDocumentDataApplied()` - Mark as applied
- `deleteExpiredExtractedDocumentData()` - Cleanup expired data

### 2. Rate Limiter

Added OCR-specific rate limiter in `server/middleware/rateLimiting.ts`:

- **`ocrLimiter`**: 10 requests per 15 minutes per user (configurable via env)
- Rate limits by user ID (not IP) for better security
- Uses `OCR_RATE_LIMIT_MAX` and `OCR_RATE_LIMIT_WINDOW_MS` env vars

### 3. API Endpoints

#### POST `/api/documents/:id/process`
Manually trigger OCR processing for a document.

**Requirements:**
- Auth + MFA enabled
- Rate limit: 10 requests per 15 minutes per user
- Document ownership verification

**Response:**
```json
{
  "success": true,
  "message": "OCR processing started",
  "documentId": "doc-123",
  "status": "processing",
  "extractedDataId": "extracted-456" // If already exists
}
```

**Phase 5 Note**: Currently returns placeholder. Actual processing will be implemented in Phase 5 (background processor).

---

#### GET `/api/documents/:id/ocr-status`
Get OCR processing status (for polling).

**Requirements:**
- Auth only

**Response (processing):**
```json
{
  "status": "processing",
  "extractedDataId": null
}
```

**Response (complete):**
```json
{
  "status": "complete",
  "extractedDataId": "extracted-456",
  "confidenceScore": 0.95,
  "userReviewed": false,
  "appliedToApplication": false,
  "extractionTimestamp": "2025-12-21T..."
}
```

---

#### GET `/api/merchant-applications/:id/extracted-data`
Get extracted data for review.

**Requirements:**
- Auth + MFA enabled
- Merchant application ownership verification

**Query Parameters:**
- `includeSensitive=true` - Include decrypted sensitive fields (requires MFA)

**Response:**
```json
{
  "success": true,
  "extractedData": [
    {
      "id": "extracted-456",
      "documentId": "doc-123",
      "data": {
        "legalBusinessName": "Acme Corp",
        "federalTaxIdNumber": "**-****6789", // Masked if includeSensitive=false
        "signerSSN": "***-**-6789",
        "confidence": 0.95
      },
      "confidenceScore": 0.95,
      "userReviewed": false,
      "reviewedAt": null,
      "appliedToApplication": false,
      "appliedAt": null,
      "extractionTimestamp": "2025-12-21T...",
      "hasSensitiveFields": true
    }
  ],
  "count": 1
}
```

**Security:**
- Returns masked data by default
- Only decrypts sensitive fields if `includeSensitive=true` query param is set
- Audits sensitive data access

---

#### POST `/api/merchant-applications/:id/apply-extracted-data`
Apply reviewed extracted data to merchant application.

**Requirements:**
- Auth + MFA enabled
- Merchant application ownership verification

**Request Body:**
```json
{
  "extractedDataId": "extracted-456",
  "reviewedFields": {
    "legalBusinessName": "Acme Corporation LLC",
    "federalTaxIdNumber": "12-3456789",
    "businessAddress": "123 Main St",
    "city": "Denver",
    "state": "CO",
    "zip": "80202",
    "routingNumber": "123456789",
    "accountNumber": "9876543210"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Extracted data applied to merchant application",
  "appliedFields": [
    "legalBusinessName",
    "federalTaxIdNumber",
    "businessAddress",
    "city",
    "state",
    "zip",
    "routingNumber",
    "accountNumber"
  ]
}
```

**Field Mapping:**
- `businessAddress`/`locationAddress` → `billingAddress`, `locationAddress`
- `routingNumber` → `abaRoutingNumber`
- `accountNumber` → `ddaNumber`
- `accountHolderName`/`accountName` → `accountName`, `nameOnBankAccount`
- `monthlySalesVolume` → `monthlySalesVolume` (converted to string)
- `incorporationState` → `incorporationState`
- `incorporationDate` → `entityStartDate` (converted to Date)
- And more...

---

## 🔒 Security Features

1. **MFA Verification**: All sensitive endpoints require MFA to be enabled
2. **Rate Limiting**: OCR processing limited to 10 requests per 15 minutes per user
3. **Ownership Verification**: Users can only access their own documents/applications
4. **Audit Logging**: All OCR operations are logged:
   - `OCR_EXTRACTION_STARTED`
   - `OCR_EXTRACTION_COMPLETED`
   - `OCR_EXTRACTION_FAILED`
   - `OCR_DATA_REVIEWED`
   - `OCR_DATA_APPLIED`
   - `OCR_DATA_DECRYPTED`
5. **Data Masking**: Sensitive fields masked by default
6. **Selective Decryption**: Only decrypts when explicitly requested with `includeSensitive=true`

---

## 📊 API Usage Flow

### 1. Trigger OCR Processing

```bash
POST /api/documents/:id/process
```

### 2. Poll for Status (Frontend)

```bash
GET /api/documents/:id/ocr-status
# Poll every 2-5 seconds until status === 'complete'
```

### 3. Review Extracted Data

```bash
# Get masked data (safe for UI)
GET /api/merchant-applications/:id/extracted-data

# Get decrypted data (requires MFA, sensitive)
GET /api/merchant-applications/:id/extracted-data?includeSensitive=true
```

### 4. Apply Reviewed Data

```bash
POST /api/merchant-applications/:id/apply-extracted-data
{
  "extractedDataId": "...",
  "reviewedFields": { /* user-confirmed fields */ }
}
```

---

## ✅ Phase 4 Complete

- ✅ Storage methods implemented
- ✅ OCR rate limiter created
- ✅ 4 API endpoints created:
  - POST `/api/documents/:id/process` - Trigger OCR
  - GET `/api/documents/:id/ocr-status` - Check status (for polling)
  - GET `/api/merchant-applications/:id/extracted-data` - Get extracted data
  - POST `/api/merchant-applications/:id/apply-extracted-data` - Apply data
- ✅ Security implemented (MFA, rate limiting, ownership verification)
- ✅ Audit logging integrated
- ✅ Data masking and decryption handled

**Note**: The `/api/documents/:id/process` endpoint currently returns a placeholder. Actual OCR processing will be implemented in **Phase 5: Background Processing**.

**Ready for Phase 5: Background OCR Processor!** 🚀

