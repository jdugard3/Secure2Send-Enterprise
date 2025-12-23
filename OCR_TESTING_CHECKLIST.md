# OCR Testing Checklist - Local Server

Use this checklist to verify everything is ready before testing the OCR system.

## ✅ Prerequisites Checklist

### 1. Environment Variables

Check your `.env` file has these variables set:

```bash
# Required for OCR
ENABLE_OCR_AUTOFILL=true                    # Must be 'true' to enable OCR
OPENAI_API_KEY_OCR_ONLY=sk-proj-...         # Your OpenAI API key
FIELD_ENCRYPTION_KEY=...                    # 64-character hex string (see below)

# Optional (with defaults)
OCR_RATE_LIMIT_MAX=10                       # Default: 10 requests per window
OCR_RATE_LIMIT_WINDOW_MS=900000            # Default: 15 minutes (900000ms)
EXTRACTED_DATA_EXPIRY_DAYS=30              # Default: 30 days
```

**Generate Encryption Key** (if you don't have one):
```bash
npm run generate:encryption-key
# Copy the output and add to .env as FIELD_ENCRYPTION_KEY=...
```

---

### 2. Database Migration

Ensure the `extracted_document_data` table exists:

```bash
# Option 1: Push schema changes (recommended)
npm run db:push

# Option 2: Run migration manually (if you have the SQL file)
# psql your_database < migrations/017_add_extracted_document_data.sql
```

**Verify table exists**:
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'extracted_document_data'
);
```

---

### 3. Dependencies Installed

Ensure required npm packages are installed:

```bash
npm install
# Should include: openai, sharp
```

**Verify packages**:
```bash
npm list openai sharp
# Should show versions, not errors
```

---

### 4. Server Running

Start the development server:

```bash
npm run dev
```

**Verify server starts without errors** - look for:
- ✅ "Server running on port 5000" (or your configured port)
- ✅ No OCR-related errors in startup logs
- ✅ Health check endpoint works: `http://localhost:5000/api/health`

---

## 🧪 Quick Test Steps

### Step 1: Verify OCR is Enabled

```bash
# Check server logs on startup
# Should see OCR services initialized (no errors)
```

### Step 2: Upload a Test Document

1. Go to: `http://localhost:5000/documents` (or your frontend URL)
2. Select a merchant application from dropdown
3. Upload a test document (W9, voided check, etc.)
4. **Expected**: Document uploads successfully

### Step 3: Check OCR Status

**Look for in server logs:**
```
🔄 Triggered background OCR processing for document: doc-123
🔄 Starting OCR processing for document: doc-123
📥 Fetching document from R2: ... (or filesystem)
🔍 Processing document with type: W9
✅ OCR processing completed for document: doc-123
💾 Extracted data saved: extracted-456
```

**Check in frontend:**
- Document should show "Processing OCR..." indicator
- After a few seconds (10-30s), should change to "OCR Complete (XX% confidence)"
- "Review Data" button should appear

### Step 4: Review Extracted Data

1. Click "Review Data" button
2. Modal should open showing extracted fields
3. Fields should be editable
4. Sensitive fields should be hidden (if applicable)
5. Can confirm fields and click "Apply to Application"

### Step 5: Verify Data Applied

1. After applying, check merchant application
2. Fields should be populated with extracted data
3. Document should show "Applied" badge

---

## 🐛 Troubleshooting

### Issue: "OCR autofill is disabled"

**Solution**: 
```bash
# Check .env file
ENABLE_OCR_AUTOFILL=true  # Must be 'true', not 'false' or missing
```

### Issue: "OpenAI API key not configured"

**Solution**:
```bash
# Verify .env has:
OPENAI_API_KEY_OCR_ONLY=sk-proj-...
# Restart server after adding
```

### Issue: "FIELD_ENCRYPTION_KEY must be at least 64 characters"

**Solution**:
```bash
# Generate a new key
npm run generate:encryption-key
# Copy output and add to .env
# Restart server
```

### Issue: "Table 'extracted_document_data' does not exist"

**Solution**:
```bash
# Run database migration
npm run db:push
```

### Issue: OCR processing never completes

**Check**:
1. OpenAI API key is valid and has credits
2. Check server logs for errors
3. Check network connectivity to OpenAI API
4. Verify document file is accessible (R2 or filesystem)

### Issue: "Processing OCR..." never stops

**Check**:
1. Check browser console for API errors
2. Check server logs for processing errors
3. Verify `/api/documents/:id/ocr-status` endpoint returns data
4. Check network tab - polling should happen every 2 seconds

### Issue: Modal doesn't open / "Review Data" doesn't work

**Check**:
1. Browser console for JavaScript errors
2. Verify merchant application ID is set on document
3. Check API endpoint: `GET /api/merchant-applications/:id/extracted-data`
4. Verify MFA is enabled (required for viewing extracted data)

---

## 🔍 Debugging Tools

### Check OCR Status via API

```bash
# Replace DOC_ID with actual document ID
curl http://localhost:5000/api/documents/DOC_ID/ocr-status \
  -H "Cookie: your-session-cookie" \
  -v
```

### Check Extracted Data via API

```bash
# Replace APP_ID with merchant application ID
curl http://localhost:5000/api/merchant-applications/APP_ID/extracted-data \
  -H "Cookie: your-session-cookie" \
  -v
```

### Check Server Logs

```bash
# Watch server logs in real-time
# Look for OCR-related log messages:
# - "Triggered background OCR processing"
# - "Starting OCR processing"
# - "OCR processing completed"
# - "Extracted data saved"
```

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Document upload completes successfully
2. ✅ "Processing OCR..." indicator appears
3. ✅ Server logs show OCR processing started
4. ✅ After 10-30 seconds, indicator changes to "OCR Complete"
5. ✅ "Review Data" button appears
6. ✅ Modal opens with extracted fields
7. ✅ Can edit and confirm fields
8. ✅ "Apply to Application" works
9. ✅ Merchant application fields are populated
10. ✅ "Applied" badge appears on document

---

## 🚀 Ready to Test!

If all checklist items are ✅, you're ready to test!

Start with:
1. Upload a simple test document (W9 form or voided check)
2. Watch server logs for OCR processing
3. Wait for processing to complete
4. Review and apply extracted data
5. Verify data appears in merchant application

Good luck! 🎉

