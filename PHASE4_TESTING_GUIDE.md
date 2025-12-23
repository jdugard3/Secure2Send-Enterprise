# Phase 4 Testing Guide: OCR API Endpoints

This guide will help you test the Phase 4 API endpoints before proceeding to Phase 5.

## Prerequisites

1. **Server Running**: Make sure your development server is running
   ```bash
   npm run dev
   ```

2. **Database Migration**: Ensure the `extracted_document_data` table exists
   ```bash
   npm run db:push
   # or run the migration manually
   ```

3. **Environment Variables**: Ensure these are set (at minimum):
   ```bash
   ENABLE_OCR_AUTOFILL=true  # Must be true to enable OCR endpoints
   OCR_RATE_LIMIT_MAX=10
   OCR_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
   ```

4. **Test User Setup**: You'll need:
   - A test user account (CLIENT role)
   - MFA enabled on the test user
   - At least one merchant application
   - At least one uploaded document

## Testing Approach

Since Phase 5 (background processing) isn't implemented yet, we can test:

✅ **What we CAN test:**
- Authentication & authorization
- Rate limiting
- MFA requirements
- Endpoint structure and validation
- Ownership verification
- Response formats
- Error handling

❌ **What requires Phase 5:**
- Actual OCR processing (will return placeholder)
- Real extracted data retrieval (need mock data for full testing)

## Test Checklist

### 1. Test OCR Feature Flag

**Test:** Verify OCR endpoints are disabled when `ENABLE_OCR_AUTOFILL=false`

```bash
# Set in .env
ENABLE_OCR_AUTOFILL=false

# Restart server, then test:
curl -X POST http://localhost:5000/api/documents/DOC_ID/process \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```

**Expected:** `503 Service Unavailable` with `OCR_FEATURE_DISABLED` error

---

### 2. Test Authentication Requirements

**Test:** Verify all endpoints require authentication

```bash
# Test without authentication
curl -X POST http://localhost:5000/api/documents/DOC_ID/process

curl -X GET http://localhost:5000/api/documents/DOC_ID/ocr-status

curl -X GET http://localhost:5000/api/merchant-applications/APP_ID/extracted-data

curl -X POST http://localhost:5000/api/merchant-applications/APP_ID/apply-extracted-data \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** All should return `401 Unauthorized` or redirect to login

---

### 3. Test MFA Requirements

**Test:** Verify MFA is required for sensitive operations

**Prerequisites:**
- User must have MFA enabled (`mfaEnabled` or `mfaEmailEnabled` = true)

**Note:** The `requireMfaSetup` middleware should handle this globally, but verify endpoints check MFA for sensitive operations.

---

### 4. Test Rate Limiting

**Test:** Verify OCR rate limiter works (10 requests per 15 minutes)

```bash
# Make 11 requests quickly
for i in {1..11}; do
  echo "Request $i:"
  curl -X POST http://localhost:5000/api/documents/DOC_ID/process \
    -H "Cookie: your-session-cookie" \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

**Expected:**
- First 10 requests: Should succeed (or return expected errors like 404)
- 11th request: `429 Too Many Requests` with rate limit message

**Note:** Rate limiting is per user ID, not IP address.

---

### 5. Test Document Ownership Verification

**Test:** Verify users can only process their own documents

```bash
# Attempt to process another user's document
curl -X POST http://localhost:5000/api/documents/OTHER_USER_DOC_ID/process \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```

**Expected:** `403 Forbidden` with "Access denied" message

---

### 6. Test POST `/api/documents/:id/process`

**Test:** Trigger OCR processing (will return placeholder until Phase 5)

```bash
# Replace DOC_ID with an actual document ID from your database
curl -X POST http://localhost:5000/api/documents/YOUR_DOC_ID/process \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OCR processing started",
  "documentId": "YOUR_DOC_ID",
  "status": "processing"
}
```

**Or if extracted data already exists:**
```json
{
  "success": true,
  "message": "Extracted data already exists for this document",
  "documentId": "YOUR_DOC_ID",
  "extractedDataId": "extracted-123",
  "status": "complete"
}
```

**Test Cases:**
- ✅ Valid document ID (should succeed)
- ✅ Document not found (should return 404)
- ✅ Document belongs to another user (should return 403)
- ✅ MFA not enabled (should return 403 with `mfaRequired: true`)
- ✅ Rate limit exceeded (should return 429)

---

### 7. Test GET `/api/documents/:id/ocr-status`

**Test:** Check OCR processing status (for polling)

```bash
curl -X GET http://localhost:5000/api/documents/YOUR_DOC_ID/ocr-status \
  -H "Cookie: your-session-cookie" \
  -v
```

**Expected Response (no extracted data):**
```json
{
  "status": "processing",
  "extractedDataId": null
}
```

**Expected Response (with extracted data):**
```json
{
  "status": "complete",
  "extractedDataId": "extracted-123",
  "confidenceScore": 0.95,
  "userReviewed": false,
  "appliedToApplication": false,
  "extractionTimestamp": "2025-12-21T10:00:00.000Z"
}
```

**Test Cases:**
- ✅ Valid document ID (should return status)
- ✅ Document not found (should return 404)
- ✅ Document belongs to another user (should return 403)

---

### 8. Test GET `/api/merchant-applications/:id/extracted-data`

**Test:** Get extracted data for review

#### 8a. Without sensitive data (default)

```bash
curl -X GET http://localhost:5000/api/merchant-applications/YOUR_APP_ID/extracted-data \
  -H "Cookie: your-session-cookie" \
  -v
```

**Expected Response (no data):**
```json
{
  "success": true,
  "extractedData": [],
  "count": 0
}
```

**Note:** To test with actual data, you'll need to create mock extracted data (see "Creating Mock Data" below).

#### 8b. With sensitive data (requires MFA)

```bash
curl -X GET "http://localhost:5000/api/merchant-applications/YOUR_APP_ID/extracted-data?includeSensitive=true" \
  -H "Cookie: your-session-cookie" \
  -v
```

**Expected Response (with mock data):**
```json
{
  "success": true,
  "extractedData": [
    {
      "id": "extracted-123",
      "documentId": "doc-456",
      "data": {
        "legalBusinessName": "Acme Corp",
        "federalTaxIdNumber": "12-3456789",  // Decrypted if includeSensitive=true
        "signerSSN": "123-45-6789"
      },
      "confidenceScore": 0.95,
      "userReviewed": false,
      "reviewedAt": null,
      "appliedToApplication": false,
      "appliedAt": null,
      "extractionTimestamp": "2025-12-21T10:00:00.000Z",
      "hasSensitiveFields": true
    }
  ],
  "count": 1
}
```

**Test Cases:**
- ✅ Valid application ID (should return data)
- ✅ Application not found (should return 404)
- ✅ Application belongs to another user (should return 403)
- ✅ MFA not enabled (should return 403 with `mfaRequired: true`)
- ✅ `includeSensitive=true` without MFA (should return 403)

---

### 9. Test POST `/api/merchant-applications/:id/apply-extracted-data`

**Test:** Apply reviewed extracted data to merchant application

```bash
curl -X POST http://localhost:5000/api/merchant-applications/YOUR_APP_ID/apply-extracted-data \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "extractedDataId": "extracted-123",
    "reviewedFields": {
      "legalBusinessName": "Acme Corporation LLC",
      "federalTaxIdNumber": "12-3456789",
      "businessAddress": "123 Main St",
      "city": "Denver",
      "state": "CO",
      "zip": "80202"
    }
  }' \
  -v
```

**Expected Response:**
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
    "zip"
  ]
}
```

**Test Cases:**
- ✅ Valid request (should succeed and update application)
- ✅ Missing `extractedDataId` (should return 400)
- ✅ Missing `reviewedFields` (should return 400)
- ✅ Invalid `extractedDataId` (should return 404)
- ✅ Extracted data belongs to different application (should return 400)
- ✅ Application not found (should return 404)
- ✅ Application belongs to another user (should return 403)
- ✅ MFA not enabled (should return 403 with `mfaRequired: true`)

---

## Creating Mock Extracted Data for Testing

Since Phase 5 isn't implemented yet, you can create mock extracted data directly in the database to test the review and apply endpoints:

### Option 1: Use a Database Script

Create `scripts/create-mock-extracted-data.ts`:

```typescript
import { storage } from "../server/storage";
import { PIIProtectionService } from "../server/services/piiProtectionService";
import crypto from "crypto";

async function createMockExtractedData() {
  const documentId = process.argv[2]; // Pass document ID as argument
  const merchantApplicationId = process.argv[3]; // Pass app ID as argument
  const userId = process.argv[4]; // Pass user ID as argument

  if (!documentId || !merchantApplicationId || !userId) {
    console.error("Usage: tsx scripts/create-mock-extracted-data.ts <documentId> <merchantApplicationId> <userId>");
    process.exit(1);
  }

  // Mock extracted W9 data
  const mockExtractedData = {
    legalBusinessName: "Acme Corporation",
    dbaBusinessName: "Acme Corp",
    federalTaxIdNumber: "12-3456789",
    businessAddress: "123 Main Street",
    city: "Denver",
    state: "CO",
    zip: "80202",
    signerName: "John Doe",
    signerSSN: "123-45-6789",
    businessType: "CORPORATION",
    confidence: 0.95,
  };

  // Encrypt and mask sensitive fields
  const { publicData, encryptedFields } = PIIProtectionService.encryptAndMask(
    mockExtractedData,
    "W9"
  );

  // Create document hash (mock)
  const documentHash = crypto.createHash("sha256")
    .update(JSON.stringify(mockExtractedData))
    .digest("hex");

  // Insert into database
  const extractedData = await storage.createExtractedDocumentData({
    documentId,
    merchantApplicationId,
    userId,
    extractedDataPublic: publicData,
    encryptedFields,
    documentHash,
    confidenceScore: "0.95",
    processingIpAddress: "127.0.0.1",
    processingUserAgent: "Test Script",
  });

  console.log("✅ Mock extracted data created:");
  console.log(`   ID: ${extractedData.id}`);
  console.log(`   Document ID: ${extractedData.documentId}`);
  console.log(`   Merchant Application ID: ${extractedData.merchantApplicationId}`);
  console.log(`   Confidence Score: ${extractedData.confidenceScore}`);
}

createMockExtractedData().catch(console.error);
```

**Usage:**
```bash
tsx scripts/create-mock-extracted-data.ts DOC_ID APP_ID USER_ID
```

### Option 2: Direct SQL Insert

```sql
-- First, get your IDs from the database
SELECT id FROM documents LIMIT 1;  -- Document ID
SELECT id FROM merchant_applications LIMIT 1;  -- Application ID
SELECT id FROM users WHERE role = 'CLIENT' LIMIT 1;  -- User ID

-- Then insert mock data (replace placeholders)
INSERT INTO extracted_document_data (
  id,
  document_id,
  merchant_application_id,
  user_id,
  extracted_data_public,
  encrypted_fields,
  document_hash,
  confidence_score,
  processing_ip_address,
  processing_user_agent
) VALUES (
  gen_random_uuid(),
  'YOUR_DOC_ID',
  'YOUR_APP_ID',
  'YOUR_USER_ID',
  '{"legalBusinessName":"Acme Corp","federalTaxIdNumber":"**-****6789","confidence":0.95}'::jsonb,
  '{"federalTaxIdNumber":"encrypted_value_here"}'::jsonb,
  'abc123...',  -- Mock hash
  '0.95',
  '127.0.0.1',
  'Test Script'
);
```

**Note:** For encrypted fields, you'll need to use the actual encryption service to generate properly encrypted values.

---

## Testing with Browser DevTools

Instead of curl, you can test directly in the browser:

1. **Open your application** in the browser
2. **Open DevTools** (F12)
3. **Go to Console** tab
4. **Use fetch API:**

```javascript
// Test POST /api/documents/:id/process
fetch('/api/documents/YOUR_DOC_ID/process', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  }
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test GET /api/documents/:id/ocr-status
fetch('/api/documents/YOUR_DOC_ID/ocr-status', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test GET /api/merchant-applications/:id/extracted-data
fetch('/api/merchant-applications/YOUR_APP_ID/extracted-data', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test GET with sensitive data
fetch('/api/merchant-applications/YOUR_APP_ID/extracted-data?includeSensitive=true', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test POST /api/merchant-applications/:id/apply-extracted-data
fetch('/api/merchant-applications/YOUR_APP_ID/apply-extracted-data', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    extractedDataId: 'extracted-123',
    reviewedFields: {
      legalBusinessName: 'Acme Corporation LLC',
      federalTaxIdNumber: '12-3456789',
    }
  })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

---

## Expected Issues & Solutions

### Issue: "OCR autofill is disabled"
**Solution:** Set `ENABLE_OCR_AUTOFILL=true` in `.env` and restart server

### Issue: "MFA must be enabled"
**Solution:** Enable MFA on your test user account

### Issue: "Access denied" on valid document
**Solution:** Verify document ownership - user must own the document/application

### Issue: Rate limit hit during testing
**Solution:** 
- Wait 15 minutes, or
- Change `OCR_RATE_LIMIT_WINDOW_MS` to a shorter window for testing, or
- In development, rate limiting is skipped for localhost (check `rateLimiting.ts`)

### Issue: "Extracted data not found"
**Solution:** Create mock extracted data using the script above, or wait for Phase 5 implementation

---

## Testing Checklist Summary

- [ ] OCR feature flag (disabled state)
- [ ] Authentication requirements
- [ ] MFA requirements
- [ ] Rate limiting (11th request should fail)
- [ ] Document ownership verification
- [ ] POST `/api/documents/:id/process` - valid request
- [ ] POST `/api/documents/:id/process` - document not found (404)
- [ ] POST `/api/documents/:id/process` - unauthorized access (403)
- [ ] GET `/api/documents/:id/ocr-status` - no data (returns "processing")
- [ ] GET `/api/documents/:id/ocr-status` - with data (returns "complete")
- [ ] GET `/api/merchant-applications/:id/extracted-data` - no data (empty array)
- [ ] GET `/api/merchant-applications/:id/extracted-data` - with mock data (masked)
- [ ] GET `/api/merchant-applications/:id/extracted-data?includeSensitive=true` - decrypted data
- [ ] POST `/api/merchant-applications/:id/apply-extracted-data` - valid request
- [ ] POST `/api/merchant-applications/:id/apply-extracted-data` - missing fields (400)
- [ ] POST `/api/merchant-applications/:id/apply-extracted-data` - invalid ID (404)
- [ ] Verify merchant application fields are updated after applying data
- [ ] Verify extracted data is marked as reviewed and applied

---

## Next Steps After Testing

Once Phase 4 testing is complete:

1. ✅ Verify all endpoints respond correctly
2. ✅ Verify security (auth, MFA, rate limiting) works
3. ✅ Verify error handling is appropriate
4. ✅ Create mock data and test full review/apply flow
5. ✅ Proceed to **Phase 5: Background OCR Processor**

**Ready for Phase 5!** 🚀

