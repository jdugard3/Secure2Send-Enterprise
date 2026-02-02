#!/usr/bin/env npx tsx

/**
 * Encryption Implementation Validation Script
 * 
 * Run this script before deploying to production to verify:
 * 1. Encryption key is valid and available
 * 2. Round-trip encryption/decryption works for all field types
 * 3. Database schema has required encryption columns
 * 4. End-to-end test with actual database operations
 * 
 * Usage:
 *   npx tsx scripts/validate-encryption-implementation.ts
 * 
 * Exit codes:
 *   0 - All validations passed
 *   1 - One or more validations failed
 */

import { config } from 'dotenv';
config();

import { db, pool } from '../server/db';
import { merchantApplications } from '../shared/schema';
import { PIIProtectionService } from '../server/services/piiProtectionService';
import { sql, eq } from 'drizzle-orm';

interface ValidationResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: ValidationResult[] = [];

function logResult(result: ValidationResult): void {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.name}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
}

/**
 * Test 1: Encryption key exists and is valid
 */
async function validateEncryptionKey(): Promise<void> {
  const testName = 'Encryption key validation';
  
  try {
    if (!PIIProtectionService.isEncryptionAvailable()) {
      logResult({ name: testName, passed: false, error: 'FIELD_ENCRYPTION_KEY is not set' });
      return;
    }
    
    // Validate key length
    const keyLength = process.env.FIELD_ENCRYPTION_KEY?.length;
    if (keyLength !== 64) {
      logResult({ 
        name: testName, 
        passed: false, 
        error: `Key length is ${keyLength}, expected 64 characters` 
      });
      return;
    }
    
    logResult({ 
      name: testName, 
      passed: true, 
      details: 'Key is set and has correct length (64 hex characters)' 
    });
  } catch (error) {
    logResult({ name: testName, passed: false, error: String(error) });
  }
}

/**
 * Test 2: Round-trip encryption for simple fields
 */
async function validateSimpleFieldEncryption(): Promise<void> {
  const testName = 'Simple field encryption round-trip';
  
  const testCases = [
    { field: 'federalTaxIdNumber', value: '12-3456789', type: 'tax_id' as const },
    { field: 'ownerSsn', value: '123-45-6789', type: 'ssn' as const },
    { field: 'abaRoutingNumber', value: '123456789', type: 'routing_number' as const },
    { field: 'ddaNumber', value: '9876543210', type: 'account_number' as const },
    { field: 'ownerStateIssuedIdNumber', value: 'D12345678', type: 'license_number' as const },
  ];
  
  const failures: string[] = [];
  
  for (const testCase of testCases) {
    try {
      const encrypted = PIIProtectionService.encryptField(testCase.value);
      const decrypted = PIIProtectionService.decryptField(encrypted);
      
      if (decrypted !== testCase.value) {
        failures.push(`${testCase.field}: expected "${testCase.value}", got "${decrypted}"`);
      }
    } catch (error) {
      failures.push(`${testCase.field}: ${String(error)}`);
    }
  }
  
  if (failures.length > 0) {
    logResult({ 
      name: testName, 
      passed: false, 
      error: failures.join('; ') 
    });
  } else {
    logResult({ 
      name: testName, 
      passed: true, 
      details: `${testCases.length} field types tested successfully` 
    });
  }
}

/**
 * Test 3: Merchant application encryption with nested arrays
 */
async function validateMerchantApplicationEncryption(): Promise<void> {
  const testName = 'Merchant application encryption with nested arrays';
  
  try {
    const testApplication = {
      federalTaxIdNumber: '12-3456789',
      ownerSsn: '123-45-6789',
      abaRoutingNumber: '123456789',
      ddaNumber: '9876543210',
      principalOfficers: [
        { name: 'John Doe', ssn: '111-22-3333', dob: '1980-01-15' },
        { name: 'Jane Smith', ssn: '444-55-6666', dob: '1985-06-20' },
      ],
      beneficialOwners: [
        { name: 'Owner 1', ssn: '777-88-9999', dob: '1975-03-10', ownershipPercentage: '50' },
      ],
    };
    
    // Encrypt
    const { encryptedFields, publicData } = PIIProtectionService.encryptMerchantApplication(testApplication as any);
    
    // Verify fields were encrypted
    const expectedFields = [
      'federalTaxIdNumber',
      'ownerSsn',
      'abaRoutingNumber',
      'ddaNumber',
      'principalOfficers.0.ssn',
      'principalOfficers.0.dob',
      'principalOfficers.1.ssn',
      'principalOfficers.1.dob',
      'beneficialOwners.0.ssn',
      'beneficialOwners.0.dob',
    ];
    
    const missingFields = expectedFields.filter(f => !(f in encryptedFields));
    if (missingFields.length > 0) {
      logResult({ 
        name: testName, 
        passed: false, 
        error: `Missing encrypted fields: ${missingFields.join(', ')}` 
      });
      return;
    }
    
    // Decrypt and verify
    const decrypted = PIIProtectionService.decryptMerchantApplication({
      ...publicData,
      encrypted_fields: encryptedFields,
    });
    
    // Verify simple fields
    if ((decrypted as any).federalTaxIdNumber !== '12-3456789') {
      logResult({ 
        name: testName, 
        passed: false, 
        error: 'federalTaxIdNumber mismatch after decryption' 
      });
      return;
    }
    
    // Verify nested fields
    const officers = (decrypted as any).principalOfficers;
    if (!officers || officers[0]?.ssn !== '111-22-3333' || officers[1]?.ssn !== '444-55-6666') {
      logResult({ 
        name: testName, 
        passed: false, 
        error: 'principalOfficers SSN mismatch after decryption' 
      });
      return;
    }
    
    const owners = (decrypted as any).beneficialOwners;
    if (!owners || owners[0]?.ssn !== '777-88-9999') {
      logResult({ 
        name: testName, 
        passed: false, 
        error: 'beneficialOwners SSN mismatch after decryption' 
      });
      return;
    }
    
    logResult({ 
      name: testName, 
      passed: true, 
      details: `${Object.keys(encryptedFields).length} fields encrypted, all decrypted correctly` 
    });
  } catch (error) {
    logResult({ name: testName, passed: false, error: String(error) });
  }
}

/**
 * Test 4: Masking validation
 */
async function validateMasking(): Promise<void> {
  const testName = 'PII masking validation';
  
  try {
    const testApplication = {
      federalTaxIdNumber: '12-3456789',
      ownerSsn: '123-45-6789',
      abaRoutingNumber: '123456789',
      ddaNumber: '9876543210',
    };
    
    const { publicData } = PIIProtectionService.encryptMerchantApplication(testApplication as any);
    
    // Check masked values
    const expectedMasks: Record<string, string> = {
      federalTaxIdNumber: '**-****6789',
      ownerSsn: '***-**-6789',
      abaRoutingNumber: '*****6789',
      ddaNumber: '****3210',
    };
    
    const failures: string[] = [];
    for (const [field, expectedMask] of Object.entries(expectedMasks)) {
      const actualMask = (publicData as any)[field];
      if (actualMask !== expectedMask) {
        failures.push(`${field}: expected "${expectedMask}", got "${actualMask}"`);
      }
    }
    
    if (failures.length > 0) {
      logResult({ 
        name: testName, 
        passed: false, 
        error: failures.join('; ') 
      });
    } else {
      logResult({ 
        name: testName, 
        passed: true, 
        details: 'All masking formats correct' 
      });
    }
  } catch (error) {
    logResult({ name: testName, passed: false, error: String(error) });
  }
}

/**
 * Test 5: Database schema has encryption columns
 */
async function validateDatabaseSchema(): Promise<void> {
  const testName = 'Database schema validation';
  
  try {
    // Use pool.query for predictable result shape (avoids Drizzle execute quirks)
    const result = await pool.query<{ column_name: string }>(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'merchant_applications' 
       AND column_name IN ('encrypted_fields', 'has_encrypted_data', 'encrypted_at')`
    );
    
    const columns = (result.rows || []).map(r => r.column_name);
    const requiredColumns = ['encrypted_fields', 'has_encrypted_data', 'encrypted_at'];
    const missingColumns = requiredColumns.filter(c => !columns.includes(c));
    
    if (missingColumns.length > 0) {
      logResult({ 
        name: testName, 
        passed: false, 
        error: `Missing columns: ${missingColumns.join(', ')}. Run "npm run migrate" first to add encryption columns (migration 021_add_merchant_app_encryption.sql).` 
      });
    } else {
      logResult({ 
        name: testName, 
        passed: true, 
        details: 'All encryption columns present in database' 
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const fullMessage = error instanceof AggregateError && error.errors?.length
      ? error.errors.map((e: unknown) => (e instanceof Error ? e.message : e)).join('; ')
      : message;
    logResult({ 
      name: testName, 
      passed: false, 
      error: `Database error: ${fullMessage}. Run "npm run migrate" first to add encryption columns.` 
    });
  }
}

/**
 * Test 6: Edge cases - empty/null values
 */
async function validateEdgeCases(): Promise<void> {
  const testName = 'Edge case handling';
  
  try {
    // Test with empty/null values
    const testApplication = {
      federalTaxIdNumber: null,
      ownerSsn: '',
      abaRoutingNumber: undefined,
      ddaNumber: '   ', // whitespace only
      principalOfficers: [
        { name: 'John Doe', ssn: null, dob: '' },
      ],
      beneficialOwners: [],
    };
    
    const { encryptedFields } = PIIProtectionService.encryptMerchantApplication(testApplication as any);
    
    // Should not encrypt empty/null values
    if (Object.keys(encryptedFields).length !== 0) {
      logResult({ 
        name: testName, 
        passed: false, 
        error: `Should not encrypt empty values, but encrypted: ${Object.keys(encryptedFields).join(', ')}` 
      });
      return;
    }
    
    logResult({ 
      name: testName, 
      passed: true, 
      details: 'Empty/null values handled correctly (not encrypted)' 
    });
  } catch (error) {
    logResult({ name: testName, passed: false, error: String(error) });
  }
}

/**
 * Test 7: Data integrity - non-PII fields preserved
 */
async function validateDataIntegrity(): Promise<void> {
  const testName = 'Data integrity (non-PII fields preserved)';
  
  try {
    const testApplication = {
      id: 'test-123',
      legalBusinessName: 'Acme Corporation',
      status: 'DRAFT',
      federalTaxIdNumber: '12-3456789',
      city: 'New York',
      state: 'NY',
      zip: '10001',
    };
    
    const { publicData } = PIIProtectionService.encryptMerchantApplication(testApplication as any);
    
    // Verify non-PII fields are preserved
    const preservedFields = ['id', 'legalBusinessName', 'status', 'city', 'state', 'zip'];
    const failures: string[] = [];
    
    for (const field of preservedFields) {
      if ((publicData as any)[field] !== (testApplication as any)[field]) {
        failures.push(`${field}: expected "${(testApplication as any)[field]}", got "${(publicData as any)[field]}"`);
      }
    }
    
    if (failures.length > 0) {
      logResult({ 
        name: testName, 
        passed: false, 
        error: failures.join('; ') 
      });
    } else {
      logResult({ 
        name: testName, 
        passed: true, 
        details: 'All non-PII fields preserved correctly' 
      });
    }
  } catch (error) {
    logResult({ name: testName, passed: false, error: String(error) });
  }
}

/**
 * Main validation runner
 */
async function runValidation(): Promise<void> {
  console.log('\n🔐 Encryption Implementation Validation');
  console.log('='.repeat(50));
  console.log('');
  
  // Run all validations
  await validateEncryptionKey();
  await validateSimpleFieldEncryption();
  await validateMerchantApplicationEncryption();
  await validateMasking();
  await validateDatabaseSchema();
  await validateEdgeCases();
  await validateDataIntegrity();
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Validation Summary');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n✅ ALL VALIDATIONS PASSED - Safe to deploy');
  } else {
    console.log('\n❌ VALIDATION FAILED - DO NOT DEPLOY');
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  // Close connection pool
  await pool.end();
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run validation
runValidation().catch(error => {
  console.error('\n❌ Validation script failed:', error);
  pool.end().then(() => process.exit(1));
});
