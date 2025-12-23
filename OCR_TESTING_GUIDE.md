# OCR Testing Guide

## Quick Start

### 1. Set Up Environment Variables

Add these to your `.env` file:

```bash
# OpenAI Configuration (REQUIRED for testing)
OPENAI_API_KEY_OCR_ONLY=sk-proj-...
OPENAI_ORG_ID=org-...  # Optional

# Enable OCR Feature
ENABLE_OCR_AUTOFILL=true
```

### 2. Prepare Test Documents

You'll need sample documents to test with. Create a `test-documents` folder and add:

✅ **Both PDFs and images are supported!**

- **W9 Form** (PDF or image) - IRS W-9 tax form
- **Voided Check** (image recommended) - shows routing/account numbers
- **Bank Statement** (PDF or image) - monthly bank statement
- **Driver's License** (image) - front of license
- **Business License** (PDF or image) - state/city business license
- **Articles of Incorporation** (PDF) - corporate formation documents

**Important**: Make sure the document type matches what you're uploading!
- Don't test a merchant application with `W9` - use an actual W-9 form
- Don't test a contract with `VOIDED_CHECK` - use an actual voided check

### 3. Run the Test

```bash
npm run test:ocr <file-path> <document-type>
```

**Examples:**

```bash
# Test a W9 form
npm run test:ocr ./test-documents/sample-w9.pdf W9

# Test a voided check
npm run test:ocr ./test-documents/voided-check.jpg VOIDED_CHECK

# Test a bank statement
npm run test:ocr ./test-documents/bank-statement.pdf BANK_STATEMENTS

# Test a driver's license
npm run test:ocr ./test-documents/drivers-license.jpg DRIVERS_LICENSE

# Test a business license
npm run test:ocr ./test-documents/business-license.pdf BUSINESS_LICENSE

# Test articles of incorporation
npm run test:ocr ./test-documents/articles.pdf ARTICLES_OF_INCORPORATION
```

## Supported Document Types

- `W9` - W-9 Tax Form
- `VOIDED_CHECK` - Voided Check (banking info)
- `BANK_STATEMENTS` - Bank Statements
- `DRIVERS_LICENSE` - Driver's License
- `PASSPORT` - Passport
- `BUSINESS_LICENSE` - Business License
- `ARTICLES_OF_INCORPORATION` - Articles of Incorporation
- `SS4_EIN_LETTER` - SS-4 EIN Confirmation Letter
- `BENEFICIAL_OWNERSHIP` - Beneficial Ownership Form

## Expected Output

The test script will:

1. ✅ Read the file
2. 🔍 Process it with GPT-4 Vision
3. 📊 Display extracted data
4. 💾 Save results to `test-output/extracted-data-<type>-<timestamp>.json`

### Sample Output:

```
🧪 Testing OCR Document Processing Service
================================================================================

📄 File Information:
   Path: ./test-documents/sample-w9.pdf
   Size: 245.32 KB
   Type: application/pdf
   Document Type: W9

📖 Reading file...
✅ File read successfully

🔍 Processing document with GPT-4 Vision...
   This may take 10-30 seconds...

================================================================================
📊 Processing Results

✅ OCR Processing: SUCCESS

⏱️  Processing Time: 12543ms
🔐 Document Hash: a1b2c3d4e5f6...
📈 Confidence Score: 92.5%

📋 Extracted Data:
{
  "legalBusinessName": "Acme Corporation LLC",
  "dbaBusinessName": "Acme Corp",
  "federalTaxIdNumber": "12-3456789",
  "businessAddress": "123 Main St",
  "city": "Denver",
  "state": "CO",
  "zip": "80202",
  "signerName": "John Doe",
  "signerSSN": "123-45-6789",
  "businessType": "LLC",
  "confidence": 0.925
}

💾 Extracted data saved to:
   ./test-output/extracted-data-w9-1704067200000.json

================================================================================
✅ Test Complete!
```

## Troubleshooting

### Error: OPENAI_API_KEY_OCR_ONLY is not set

Make sure you've added the API key to your `.env` file and restarted your terminal.

### Error: ENABLE_OCR_AUTOFILL is not set to "true"

Add `ENABLE_OCR_AUTOFILL=true` to your `.env` file.

### Error: File size exceeds limit

- **Images**: Maximum 20MB
- **PDFs**: Maximum 512MB

### Error: Timeout (30s exceeded)

- Large or complex documents may take longer
- Check your OpenAI API quota/rate limits
- Try with a smaller file or lower resolution

### Error: No response from OpenAI API

- Verify your API key is correct
- Check your OpenAI account has credits
- Ensure you have access to GPT-4 Vision models
- Check your network connection

### Low Confidence Scores (<80%)

This is expected for:
- Poor quality scans
- Handwritten text
- Heavily redacted documents
- Documents with missing information

In production, low-confidence fields (<80%) will be flagged for mandatory user review.

## File Size Limits

- **Images**: 20MB maximum (GPT-4 Vision limit)
- **PDFs**: 50MB maximum (uploaded via OpenAI Files API)
- **Supported formats**: JPEG, PNG, GIF, WEBP, PDF

## Cost Considerations

GPT-4 Vision pricing (as of 2024):
- **Input**: ~$0.01 per page/image
- **Output**: ~$0.03 per 1K tokens

A typical document extraction costs approximately **$0.01-0.02** per document.

## Next Steps

After testing Phase 1:

1. ✅ Verify extracted data accuracy
2. ✅ Check confidence scores
3. ✅ Test with various document types
4. ✅ Proceed to Phase 2 (PII Protection Service)

