# Phase 2: PII Protection Service - Testing Guide

## Quick Start

### 1. Generate Encryption Key

First, generate a secure encryption key:

```bash
npm run generate:encryption-key
```

This will output a 64-character hex string. Add it to your `.env` file:

```bash
FIELD_ENCRYPTION_KEY=your-64-character-hex-key-here
```

### 2. Test PII Protection Service

Run the test suite:

```bash
npm run test:pii
```

## What Gets Tested

The test script verifies:

1. ✅ **Encryption/Decryption**: Encrypts and decrypts sensitive fields correctly
2. ✅ **Data Masking**: Masks sensitive values for display (SSN, Tax ID, Account Numbers, etc.)
3. ✅ **Public/Encrypted Separation**: Separates data into public (masked) and encrypted fields
4. ✅ **Decrypt and Merge**: Reconstructs full data from public + encrypted
5. ✅ **Array Fields**: Handles beneficial ownership arrays correctly
6. ✅ **Batch Operations**: Encrypts/decrypts multiple fields at once

## Expected Output

```
🔒 Testing PII Protection Service
================================================================================

✅ Encryption key is configured

📋 Test Data:
{
  "legalBusinessName": "Acme Corporation LLC",
  "federalTaxIdNumber": "12-3456789",
  "signerSSN": "123-45-6789",
  ...
}

🧪 Test 1: Encryption and Decryption

   Original SSN: 123-45-6789
   Encrypted: abc123...xyz...
   Is Encrypted: true
   Decrypted: 123-45-6789
   Match: ✅

🧪 Test 2: Data Masking

   SSN: 123-45-6789 → ***-**-6789
   Tax ID: 12-3456789 → **-****6789
   Account: 9876543210 → ****3210
   Routing: 123456789 → *****6789
   DOB: 1990-05-15 → **/**/****
   License: DL123456789 → ****6789

🧪 Test 3: Separate Public and Encrypted Data

   Public (Masked) Data:
   {
     "signerSSN": "***-**-6789",
     "federalTaxIdNumber": "**-****6789",
     ...
   }

   Encrypted Fields:
     signerSSN: [encrypted]
     federalTaxIdNumber: [encrypted]
     ...

🧪 Test 4: Decrypt and Merge

   Decrypted Data:
   {
     "signerSSN": "123-45-6789",
     "federalTaxIdNumber": "12-3456789",
     ...
   }

✅ All Tests Passed!
```

## Masking Formats

The service masks different field types appropriately:

- **SSN**: `***-**-1234` (shows last 4 digits)
- **Tax ID/EIN**: `**-****1234` (shows last 4 digits)
- **Account Number**: `****5678` (shows last 4 digits)
- **Routing Number**: `*****6789` (shows last 4 digits)
- **DOB**: `**/**/****` (hides entire date)
- **License Number**: `****5678` (shows last 4 characters)
- **Phone**: `(XXX) XXX-****` (shows area code, masks number)

## Integration with Phase 1

Phase 2 integrates with Phase 1 OCR results:

```typescript
import { SecureDocumentProcessingService } from './services/documentProcessingService';
import { PIIProtectionService } from './services/piiProtectionService';

// 1. Extract data from document (Phase 1)
const result = await SecureDocumentProcessingService.processDocument(buffer, options);

// 2. Separate into public and encrypted (Phase 2)
const { public: publicData, encrypted: encryptedFields } = 
  PIIProtectionService.separatePublicAndEncrypted(result.data);

// 3. Store public data in database (visible in UI)
// 4. Store encrypted fields separately (encrypted at rest)
// 5. When user needs to view sensitive fields, decrypt:
const fullData = PIIProtectionService.decryptAndMerge(publicData, encryptedFields);
```

## Security Features

✅ **AES-256-GCM Encryption**: Industry-standard encryption algorithm
✅ **Unique IVs**: Each encryption uses a random initialization vector
✅ **Field-Level Encryption**: Only sensitive fields are encrypted
✅ **Separate Key**: Uses dedicated `FIELD_ENCRYPTION_KEY` (not SESSION_SECRET)
✅ **Data Masking**: Safe display format for UI
✅ **Secure Key Storage**: Key stored in environment variables (never in code)

## Troubleshooting

### Error: "FIELD_ENCRYPTION_KEY environment variable is not set"

**Solution**: Generate a key and add to `.env`:
```bash
npm run generate:encryption-key
# Copy the output and add to .env
```

### Error: "FIELD_ENCRYPTION_KEY must be exactly 64 hex characters"

**Solution**: The key must be exactly 64 hexadecimal characters (0-9, a-f). Regenerate:
```bash
npm run generate:encryption-key
```

### Error: "Failed to decrypt sensitive field"

**Possible causes**:
- Wrong encryption key (regenerated key won't decrypt old data)
- Data was corrupted
- Data wasn't encrypted with this service

**Solution**: Make sure you're using the same key that was used for encryption.

## Next Steps

After Phase 2 testing:

1. ✅ Encryption/Decryption works
2. ✅ Data masking works
3. ✅ Ready for Phase 3: Database schema updates

