/**
 * Test script for PII Protection Service
 * 
 * Tests encryption, decryption, and masking of sensitive fields
 * 
 * Usage:
 *   npm run test:pii
 */

import { config } from 'dotenv';
config();

// Import env to ensure validation
import '../server/env';

import { PIIProtectionService } from '../server/services/piiProtectionService';

async function testPIIProtection() {
  console.log('\n🔒 Testing PII Protection Service\n');
  console.log('='.repeat(80) + '\n');

  // Check if encryption key is set
  if (!process.env.FIELD_ENCRYPTION_KEY) {
    console.error('❌ FIELD_ENCRYPTION_KEY is not set!');
    console.log('\nTo generate a key, run:');
    console.log('  npm run generate:encryption-key');
    console.log('\nThen add to your .env file:');
    console.log('  FIELD_ENCRYPTION_KEY=<generated-key>\n');
    process.exit(1);
  }

  const keyLength = process.env.FIELD_ENCRYPTION_KEY.length;
  if (keyLength !== 64) {
    console.error(`❌ FIELD_ENCRYPTION_KEY must be 64 hex characters, got ${keyLength}`);
    console.log('\nGenerate a new key with:');
    console.log('  npm run generate:encryption-key\n');
    process.exit(1);
  }

  console.log('✅ Encryption key is configured\n');

  // Test data
  const testData = {
    // W9 data
    legalBusinessName: 'Acme Corporation LLC',
    federalTaxIdNumber: '12-3456789',
    signerSSN: '123-45-6789',
    
    // Banking data
    routingNumber: '123456789',
    accountNumber: '9876543210',
    
    // ID data
    dob: '1990-05-15',
    licenseNumber: 'DL123456789',
    
    // Confidence
    confidence: 0.95,
  };

  console.log('📋 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('');

  try {
    // Test 1: Encryption/Decryption
    console.log('🧪 Test 1: Encryption and Decryption\n');

    const encryptedSSN = PIIProtectionService.encryptField(testData.signerSSN!);
    console.log(`   Original SSN: ${testData.signerSSN}`);
    console.log(`   Encrypted: ${encryptedSSN.substring(0, 50)}...`);
    console.log(`   Is Encrypted: ${PIIProtectionService.isEncrypted(encryptedSSN)}`);

    const decryptedSSN = PIIProtectionService.decryptField(encryptedSSN);
    console.log(`   Decrypted: ${decryptedSSN}`);
    console.log(`   Match: ${decryptedSSN === testData.signerSSN ? '✅' : '❌'}\n`);

    if (decryptedSSN !== testData.signerSSN) {
      throw new Error('Encryption/Decryption failed!');
    }

    // Test 2: Masking
    console.log('🧪 Test 2: Data Masking\n');

    const maskedSSN = PIIProtectionService.maskSensitiveValue(testData.signerSSN, 'ssn');
    const maskedTaxId = PIIProtectionService.maskSensitiveValue(testData.federalTaxIdNumber, 'tax_id');
    const maskedAccount = PIIProtectionService.maskSensitiveValue(testData.accountNumber, 'account_number');
    const maskedRouting = PIIProtectionService.maskSensitiveValue(testData.routingNumber, 'routing_number');
    const maskedDOB = PIIProtectionService.maskSensitiveValue(testData.dob, 'dob');
    const maskedLicense = PIIProtectionService.maskSensitiveValue(testData.licenseNumber, 'license_number');

    console.log(`   SSN: ${testData.signerSSN} → ${maskedSSN}`);
    console.log(`   Tax ID: ${testData.federalTaxIdNumber} → ${maskedTaxId}`);
    console.log(`   Account: ${testData.accountNumber} → ${maskedAccount}`);
    console.log(`   Routing: ${testData.routingNumber} → ${maskedRouting}`);
    console.log(`   DOB: ${testData.dob} → ${maskedDOB}`);
    console.log(`   License: ${testData.licenseNumber} → ${maskedLicense}\n`);

    // Test 3: Separate Public and Encrypted
    console.log('🧪 Test 3: Separate Public and Encrypted Data\n');

    const { public: publicData, encrypted: encryptedFields } = 
      PIIProtectionService.separatePublicAndEncrypted(testData);

    console.log('   Public (Masked) Data:');
    console.log(JSON.stringify(publicData, null, 2));
    console.log('\n   Encrypted Fields:');
    console.log(Object.keys(encryptedFields).map(key => `     ${key}: [encrypted]`).join('\n'));
    console.log('');

    // Verify public data is masked
    if (publicData.signerSSN !== maskedSSN) {
      throw new Error(`Public SSN mismatch: expected ${maskedSSN}, got ${publicData.signerSSN}`);
    }
    if (publicData.federalTaxIdNumber !== maskedTaxId) {
      throw new Error(`Public Tax ID mismatch: expected ${maskedTaxId}, got ${publicData.federalTaxIdNumber}`);
    }

    // Test 4: Decrypt and Merge
    console.log('🧪 Test 4: Decrypt and Merge\n');

    const decryptedData = PIIProtectionService.decryptAndMerge(publicData, encryptedFields);

    console.log('   Decrypted Data:');
    console.log(JSON.stringify(decryptedData, null, 2));
    console.log('');

    // Verify decrypted data matches original
    if (decryptedData.signerSSN !== testData.signerSSN) {
      throw new Error(`Decrypted SSN mismatch: expected ${testData.signerSSN}, got ${decryptedData.signerSSN}`);
    }
    if (decryptedData.federalTaxIdNumber !== testData.federalTaxIdNumber) {
      throw new Error(`Decrypted Tax ID mismatch: expected ${testData.federalTaxIdNumber}, got ${decryptedData.federalTaxIdNumber}`);
    }

    // Test 5: Beneficial Ownership (array handling)
    console.log('🧪 Test 5: Beneficial Ownership (Array Fields)\n');

    const ownershipData = {
      owners: [
        {
          fullName: 'John Doe',
          ssn: '123-45-6789',
          dob: '1980-01-15',
          ownershipPercentage: 50,
        },
        {
          fullName: 'Jane Smith',
          ssn: '987-65-4321',
          dob: '1985-03-20',
          ownershipPercentage: 50,
        },
      ],
      confidence: 0.9,
    };

    const { public: publicOwnership, encrypted: encryptedOwnership } = 
      PIIProtectionService.separatePublicAndEncrypted(ownershipData);

    console.log('   Public Ownership Data:');
    console.log(JSON.stringify(publicOwnership, null, 2));
    console.log('\n   Encrypted Ownership Fields:');
    console.log(Object.keys(encryptedOwnership).map(key => `     ${key}: [encrypted]`).join('\n'));
    console.log('');

    const decryptedOwnership = PIIProtectionService.decryptAndMerge(publicOwnership, encryptedOwnership);

    // Verify owners array is decrypted correctly
    if (decryptedOwnership.owners[0].ssn !== ownershipData.owners[0].ssn) {
      throw new Error('Owner 0 SSN decryption failed');
    }
    if (decryptedOwnership.owners[1].ssn !== ownershipData.owners[1].ssn) {
      throw new Error('Owner 1 SSN decryption failed');
    }

    console.log('✅ Owner decryption verified\n');

    // Test 6: Batch operations
    console.log('🧪 Test 6: Batch Encryption/Decryption\n');

    const fieldsToEncrypt = {
      field1: 'value1',
      field2: 'value2',
      field3: 'value3',
    };

    const encryptedBatch = PIIProtectionService.encryptFields(fieldsToEncrypt);
    console.log(`   Encrypted ${Object.keys(encryptedBatch).length} fields`);

    const decryptedBatch = PIIProtectionService.decryptFields(encryptedBatch);
    console.log(`   Decrypted ${Object.keys(decryptedBatch).length} fields`);

    if (decryptedBatch.field1 !== fieldsToEncrypt.field1) {
      throw new Error('Batch decryption failed');
    }

    console.log('✅ Batch operations verified\n');

    // Summary
    console.log('='.repeat(80));
    console.log('✅ All Tests Passed!\n');
    console.log('Summary:');
    console.log('  ✅ Encryption/Decryption works correctly');
    console.log('  ✅ Data masking works correctly');
    console.log('  ✅ Public/Encrypted separation works');
    console.log('  ✅ Decrypt and merge works');
    console.log('  ✅ Array fields (owners) handled correctly');
    console.log('  ✅ Batch operations work\n');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPIIProtection();

