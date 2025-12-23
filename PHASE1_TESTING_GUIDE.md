# Phase 1 OCR Testing - Quick Start Guide

## ✅ Prerequisites Check

First, make sure your environment is set up:

```bash
# Check if your .env file has these set:
OPENAI_API_KEY_OCR_ONLY=sk-proj-...
ENABLE_OCR_AUTOFILL=true
```

You can verify this by running the test - it will show you what's configured:
```bash
npm run test:ocr
# (without arguments, it will show usage)
```

## 🧪 How to Test Phase 1

### Basic Test Command

```bash
npm run test:ocr <file-path> <document-type>
```

### Step-by-Step Testing

#### 1. Test with Existing PDF (Quick Test)

You already have PDFs in your `templates/` folder. Test one:

```bash
# Test the MSA document as a business license
npm run test:ocr "./templates/NEW CorduroMSA_CRB (combined).pdf" BUSINESS_LICENSE
```

**Expected Result:**
- ✅ File uploads to OpenAI
- ✅ Extracts address, city, state, zip
- ✅ Saves results to `test-output/extracted-data-business_license-<timestamp>.json`
- ✅ Cleans up uploaded file from OpenAI

#### 2. Test with Different Document Types

**Supported Document Types:**
- `W9` - W-9 Tax Form
- `VOIDED_CHECK` - Voided Check
- `BANK_STATEMENTS` - Bank Statements  
- `DRIVERS_LICENSE` - Driver's License
- `PASSPORT` - Passport
- `BUSINESS_LICENSE` - Business License
- `ARTICLES_OF_INCORPORATION` - Articles of Incorporation
- `SS4_EIN_LETTER` - SS-4 EIN Letter
- `BENEFICIAL_OWNERSHIP` - Beneficial Ownership Form

**Examples:**

```bash
# If you have a W9 PDF
npm run test:ocr "./path/to/w9-form.pdf" W9

# If you have a voided check image
npm run test:ocr "./path/to/voided-check.jpg" VOIDED_CHECK

# If you have a driver's license image
npm run test:ocr "./path/to/drivers-license.jpg" DRIVERS_LICENSE

# Test any PDF
npm run test:ocr "./templates/CorduroMSA_CRB (2025.10.23) (5).pdf" BUSINESS_LICENSE
```

## 📊 Understanding Test Results

### Successful Test Output

When a test succeeds, you'll see:

```
✅ OCR Processing: SUCCESS

⏱️  Processing Time: 12933ms
🔐 Document Hash: 722f89756218c19b1605ec3f0784ccda0e620219e9a808ac09eaafe6abaf6dfb
📈 Confidence Score: 60.0%

📋 Extracted Data:
{
  "businessAddress": "550 Reserve Street, STE 190, Southlake, Texas 76092",
  "city": "Southlake",
  "state": "TX",
  "zip": "76092",
  "confidence": 0.6
}

💾 Extracted data saved to: test-output/extracted-data-business_license-<timestamp>.json
```

**What to Check:**
- ✅ `Processing Time`: Should be 5-30 seconds (normal)
- ✅ `Confidence Score`: 0-1 (higher is better, >0.8 is good)
- ✅ `Extracted Data`: Should contain relevant fields based on document type
- ✅ File cleanup: Should see "🗑️ Deleted file from OpenAI"

### Low Confidence Scores

If confidence is < 0.8 (80%), it means:
- The document might not match the specified type
- The document quality might be poor
- Some fields might be missing or unclear

**This is OK for Phase 1 testing!** In production, low-confidence fields will require user review.

## 🔍 Testing Different Scenarios

### Test 1: PDF Processing ✅

```bash
npm run test:ocr "./templates/NEW CorduroMSA_CRB (combined).pdf" BUSINESS_LICENSE
```

**What to verify:**
- ✅ PDF uploads successfully
- ✅ Data is extracted
- ✅ File is cleaned up from OpenAI

### Test 2: Image Processing (if you have images)

```bash
# If you have an image file
npm run test:ocr "./path/to/document.jpg" W9
```

**What to verify:**
- ✅ Image is processed via base64 encoding
- ✅ Data is extracted
- ✅ Processing is faster than PDFs

### Test 3: Wrong Document Type

```bash
# Test with wrong type to see how it handles mismatches
npm run test:ocr "./templates/NEW CorduroMSA_CRB (combined).pdf" W9
```

**Expected:**
- ✅ Processing succeeds but extracts minimal data
- ✅ Lower confidence score (< 0.5)
- ✅ Some fields might be null

## 📁 Viewing Results

All test results are saved to `test-output/` folder:

```bash
# View the latest result
cat test-output/extracted-data-business_license-*.json | jq

# Or open in your editor
code test-output/extracted-data-business_license-*.json
```

## ⚠️ Common Issues

### Issue: "OPENAI_API_KEY_OCR_ONLY not configured"

**Solution:** Add to `.env`:
```bash
OPENAI_API_KEY_OCR_ONLY=sk-proj-your-key-here
ENABLE_OCR_AUTOFILL=true
```

### Issue: "File not found"

**Solution:** Use the full path or check the file exists:
```bash
# Use quotes for paths with spaces
npm run test:ocr "./templates/NEW CorduroMSA_CRB (combined).pdf" W9

# Check if file exists
ls -la "./templates/NEW CorduroMSA_CRB (combined).pdf"
```

### Issue: "Timeout" or "Processing takes too long"

**Solution:** This is normal for large PDFs. The timeout is 30 seconds. If it consistently times out, the PDF might be too large or complex.

### Issue: Empty extracted data

**Possible causes:**
- Document type doesn't match the document (e.g., testing MSA form as W9)
- Document quality is poor
- Document doesn't contain expected information

**Solution:** Make sure you're using the correct document type for the file you're testing.

## ✅ Phase 1 Success Criteria

Phase 1 is working correctly if:

1. ✅ **PDFs can be uploaded and processed**
   ```bash
   npm run test:ocr "./templates/NEW CorduroMSA_CRB (combined).pdf" BUSINESS_LICENSE
   # Should succeed with extracted data
   ```

2. ✅ **Images can be processed**
   - Test with any JPEG/PNG file
   - Should extract data successfully

3. ✅ **Data is extracted and validated**
   - Check `test-output/` folder for JSON results
   - Data should be properly formatted
   - Confidence scores should be present

4. ✅ **Cleanup works**
   - Should see "🗑️ Deleted file from OpenAI" in output
   - No files left on OpenAI servers

5. ✅ **Error handling works**
   - Test with invalid file paths → should show helpful error
   - Test with wrong document type → should still process (low confidence OK)

## 🎯 Quick Test Checklist

Run these to verify Phase 1:

```bash
# 1. Test PDF processing
npm run test:ocr "./templates/NEW CorduroMSA_CRB (combined).pdf" BUSINESS_LICENSE

# 2. Check output file was created
ls -la test-output/extracted-data-business_license-*.json

# 3. Verify extracted data
cat test-output/extracted-data-business_license-*.json

# 4. Test with different document type
npm run test:ocr "./templates/CorduroMSA_CRB (2025.10.23) (5).pdf" BUSINESS_LICENSE
```

## 📝 Next Steps After Testing

Once Phase 1 is working:

1. ✅ You've verified PDF and image processing works
2. ✅ Data extraction is functional
3. ✅ Ready for Phase 2: PII Protection Service

**Ready to move to Phase 2?** The next phase will add encryption for sensitive fields (SSN, Tax ID, Account Numbers, etc.).

