#!/usr/bin/env npx tsx

/**
 * Unit Tests for PII Encryption Service
 * 
 * Run with: npx tsx scripts/test-encryption.ts
 * 
 * Tests:
 * - Basic encryption/decryption round-trip
 * - All field types (SSN, Tax ID, routing number, account number, etc.)
 * - Merchant application encryption with nested arrays
 * - Edge cases (null, undefined, empty values)
 * - Masking validation
 * - Data integrity (non-PII fields preserved)
 */

import { config } from 'dotenv';
config();

// Only import after loading env
import { PIIProtectionService } from '../server/services/piiProtectionService';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${errorMessage}`);
  }
}

function assertEqual(actual: any, expected: any, message: string = ''): void {
  if (actual !== expected) {
    throw new Error(`${message ? message + ': ' : ''}Expected "${expected}", got "${actual}"`);
  }
}

function assertNotNull(value: any, message: string = ''): void {
  if (value === null || value === undefined) {
    throw new Error(`${message ? message + ': ' : ''}Value is null or undefined`);
  }
}

function assertArrayLength(arr: any[], expected: number, message: string = ''): void {
  if (arr.length !== expected) {
    throw new Error(`${message ? message + ': ' : ''}Expected array length ${expected}, got ${arr.length}`);
  }
}

console.log('\n🔐 PII Encryption Unit Tests\n' + '='.repeat(50) + '\n');

// Check if encryption key is available
if (!PIIProtectionService.isEncryptionAvailable()) {
  console.log('⚠️  FIELD_ENCRYPTION_KEY is not set');
  console.log('   Set it with: export FIELD_ENCRYPTION_KEY="<64-char-hex>"');
  console.log('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Test Suite 1: Basic Field Encryption
console.log('\n📋 Suite 1: Basic Field Encryption');
console.log('-'.repeat(40));

test('should encrypt and decrypt SSN correctly', () => {
  const original = '123-45-6789';
  const encrypted = PIIProtectionService.encryptField(original);
  const decrypted = PIIProtectionService.decryptField(encrypted);
  assertEqual(decrypted, original);
});

test('should encrypt and decrypt Tax ID correctly', () => {
  const original = '12-3456789';
  const encrypted = PIIProtectionService.encryptField(original);
  const decrypted = PIIProtectionService.decryptField(encrypted);
  assertEqual(decrypted, original);
});

test('should encrypt and decrypt routing number correctly', () => {
  const original = '123456789';
  const encrypted = PIIProtectionService.encryptField(original);
  const decrypted = PIIProtectionService.decryptField(encrypted);
  assertEqual(decrypted, original);
});

test('should encrypt and decrypt account number correctly', () => {
  const original = '9876543210';
  const encrypted = PIIProtectionService.encryptField(original);
  const decrypted = PIIProtectionService.decryptField(encrypted);
  assertEqual(decrypted, original);
});

test('should encrypt and decrypt driver license correctly', () => {
  const original = 'D12345678';
  const encrypted = PIIProtectionService.encryptField(original);
  const decrypted = PIIProtectionService.decryptField(encrypted);
  assertEqual(decrypted, original);
});

test('each encryption should produce unique ciphertext', () => {
  const original = '123-45-6789';
  const encrypted1 = PIIProtectionService.encryptField(original);
  const encrypted2 = PIIProtectionService.encryptField(original);
  // Due to random IV, each encryption should be different
  if (encrypted1 === encrypted2) {
    throw new Error('Encryptions should produce different ciphertext due to random IV');
  }
  // But both should decrypt to the same value
  assertEqual(PIIProtectionService.decryptField(encrypted1), original);
  assertEqual(PIIProtectionService.decryptField(encrypted2), original);
});

// Test Suite 2: Merchant Application Encryption
console.log('\n📋 Suite 2: Merchant Application Encryption');
console.log('-'.repeat(40));

test('should encrypt simple merchant application fields', () => {
  const application = {
    federalTaxIdNumber: '12-3456789',
    ownerSsn: '123-45-6789',
    abaRoutingNumber: '123456789',
    ddaNumber: '9876543210',
    ownerStateIssuedIdNumber: 'D12345678',
  };
  
  const { encryptedFields, publicData } = PIIProtectionService.encryptMerchantApplication(application as any);
  
  // Verify fields were encrypted
  assertNotNull(encryptedFields.federalTaxIdNumber, 'federalTaxIdNumber should be encrypted');
  assertNotNull(encryptedFields.ownerSsn, 'ownerSsn should be encrypted');
  assertNotNull(encryptedFields.abaRoutingNumber, 'abaRoutingNumber should be encrypted');
  assertNotNull(encryptedFields.ddaNumber, 'ddaNumber should be encrypted');
  assertNotNull(encryptedFields.ownerStateIssuedIdNumber, 'ownerStateIssuedIdNumber should be encrypted');
});

test('should encrypt principalOfficers nested SSNs', () => {
  const application = {
    principalOfficers: [
      { name: 'John Doe', ssn: '111-22-3333', dob: '1980-01-15' },
      { name: 'Jane Smith', ssn: '444-55-6666', dob: '1985-06-20' },
    ],
  };
  
  const { encryptedFields } = PIIProtectionService.encryptMerchantApplication(application as any);
  
  assertNotNull(encryptedFields['principalOfficers.0.ssn'], 'First officer SSN should be encrypted');
  assertNotNull(encryptedFields['principalOfficers.0.dob'], 'First officer DOB should be encrypted');
  assertNotNull(encryptedFields['principalOfficers.1.ssn'], 'Second officer SSN should be encrypted');
  assertNotNull(encryptedFields['principalOfficers.1.dob'], 'Second officer DOB should be encrypted');
});

test('should encrypt beneficialOwners nested SSNs', () => {
  const application = {
    beneficialOwners: [
      { name: 'Owner 1', ssn: '777-88-9999', dob: '1975-03-10' },
    ],
  };
  
  const { encryptedFields } = PIIProtectionService.encryptMerchantApplication(application as any);
  
  assertNotNull(encryptedFields['beneficialOwners.0.ssn'], 'Owner SSN should be encrypted');
  assertNotNull(encryptedFields['beneficialOwners.0.dob'], 'Owner DOB should be encrypted');
});

test('should decrypt merchant application correctly', () => {
  const original = {
    federalTaxIdNumber: '12-3456789',
    ownerSsn: '123-45-6789',
    principalOfficers: [
      { name: 'John Doe', ssn: '111-22-3333', dob: '1980-01-15' },
    ],
    beneficialOwners: [
      { name: 'Owner 1', ssn: '777-88-9999', dob: '1975-03-10' },
    ],
  };
  
  const { encryptedFields, publicData } = PIIProtectionService.encryptMerchantApplication(original as any);
  const decrypted = PIIProtectionService.decryptMerchantApplication({
    ...publicData,
    encrypted_fields: encryptedFields,
  });
  
  assertEqual((decrypted as any).federalTaxIdNumber, '12-3456789', 'federalTaxIdNumber');
  assertEqual((decrypted as any).ownerSsn, '123-45-6789', 'ownerSsn');
  assertEqual((decrypted as any).principalOfficers[0].ssn, '111-22-3333', 'principalOfficers[0].ssn');
  assertEqual((decrypted as any).beneficialOwners[0].ssn, '777-88-9999', 'beneficialOwners[0].ssn');
});

// Test Suite 3: Masking Validation
console.log('\n📋 Suite 3: Masking Validation');
console.log('-'.repeat(40));

test('should mask SSN correctly', () => {
  const masked = PIIProtectionService.maskSensitiveValue('123-45-6789', 'ssn');
  assertEqual(masked, '***-**-6789');
});

test('should mask Tax ID correctly', () => {
  const masked = PIIProtectionService.maskSensitiveValue('12-3456789', 'tax_id');
  assertEqual(masked, '**-****6789');
});

test('should mask routing number correctly', () => {
  const masked = PIIProtectionService.maskSensitiveValue('123456789', 'routing_number');
  assertEqual(masked, '*****6789');
});

test('should mask account number correctly', () => {
  const masked = PIIProtectionService.maskSensitiveValue('9876543210', 'account_number');
  assertEqual(masked, '****3210');
});

test('should mask DOB correctly', () => {
  const masked = PIIProtectionService.maskSensitiveValue('01/15/1980', 'dob');
  assertEqual(masked, '**/**/****');
});

test('should mask license number correctly', () => {
  const masked = PIIProtectionService.maskSensitiveValue('D12345678', 'license_number');
  assertEqual(masked, '****5678');
});

test('encrypted application publicData should contain masked values', () => {
  const application = {
    federalTaxIdNumber: '12-3456789',
    ownerSsn: '123-45-6789',
  };
  
  const { publicData } = PIIProtectionService.encryptMerchantApplication(application as any);
  
  assertEqual((publicData as any).federalTaxIdNumber, '**-****6789', 'publicData federalTaxIdNumber should be masked');
  assertEqual((publicData as any).ownerSsn, '***-**-6789', 'publicData ownerSsn should be masked');
});

// Test Suite 4: Edge Cases
console.log('\n📋 Suite 4: Edge Cases');
console.log('-'.repeat(40));

test('should handle null values (no encryption)', () => {
  const application = {
    federalTaxIdNumber: null,
    ownerSsn: undefined,
  };
  
  const { encryptedFields } = PIIProtectionService.encryptMerchantApplication(application as any);
  
  if (Object.keys(encryptedFields).length !== 0) {
    throw new Error('Should not encrypt null/undefined values');
  }
});

test('should handle empty string values (no encryption)', () => {
  const application = {
    federalTaxIdNumber: '',
    ownerSsn: '   ', // whitespace only
  };
  
  const { encryptedFields } = PIIProtectionService.encryptMerchantApplication(application as any);
  
  if (Object.keys(encryptedFields).length !== 0) {
    throw new Error('Should not encrypt empty/whitespace values');
  }
});

test('should handle empty arrays (no encryption)', () => {
  const application = {
    principalOfficers: [],
    beneficialOwners: [],
  };
  
  const { encryptedFields } = PIIProtectionService.encryptMerchantApplication(application as any);
  
  if (Object.keys(encryptedFields).length !== 0) {
    throw new Error('Should not encrypt empty arrays');
  }
});

test('should handle missing encrypted_fields gracefully', () => {
  const application = {
    federalTaxIdNumber: '12-3456789',
    encrypted_fields: null,
  };
  
  // Should return as-is without error
  const decrypted = PIIProtectionService.decryptMerchantApplication(application);
  assertEqual((decrypted as any).federalTaxIdNumber, '12-3456789');
});

// Test Suite 5: Data Integrity
console.log('\n📋 Suite 5: Data Integrity');
console.log('-'.repeat(40));

test('should preserve non-PII fields', () => {
  const application = {
    id: 'app-123',
    legalBusinessName: 'Acme Corporation',
    status: 'DRAFT',
    city: 'New York',
    state: 'NY',
    federalTaxIdNumber: '12-3456789',
  };
  
  const { publicData } = PIIProtectionService.encryptMerchantApplication(application as any);
  
  assertEqual((publicData as any).id, 'app-123', 'id should be preserved');
  assertEqual((publicData as any).legalBusinessName, 'Acme Corporation', 'legalBusinessName should be preserved');
  assertEqual((publicData as any).status, 'DRAFT', 'status should be preserved');
  assertEqual((publicData as any).city, 'New York', 'city should be preserved');
  assertEqual((publicData as any).state, 'NY', 'state should be preserved');
});

test('should preserve non-PII fields in nested arrays', () => {
  const application = {
    principalOfficers: [
      { name: 'John Doe', title: 'CEO', email: 'john@example.com', ssn: '111-22-3333' },
    ],
    beneficialOwners: [
      { name: 'Owner 1', ownershipPercentage: '50', ssn: '444-55-6666' },
    ],
  };
  
  const { publicData } = PIIProtectionService.encryptMerchantApplication(application as any);
  
  // Check principal officer non-PII preserved
  assertEqual((publicData as any).principalOfficers[0].name, 'John Doe');
  assertEqual((publicData as any).principalOfficers[0].title, 'CEO');
  assertEqual((publicData as any).principalOfficers[0].email, 'john@example.com');
  
  // Check beneficial owner non-PII preserved
  assertEqual((publicData as any).beneficialOwners[0].name, 'Owner 1');
  assertEqual((publicData as any).beneficialOwners[0].ownershipPercentage, '50');
});

// Test Suite 6: Validation Helper
console.log('\n📋 Suite 6: Validation Helpers');
console.log('-'.repeat(40));

test('validateEncryption should return success', () => {
  const result = PIIProtectionService.validateEncryption();
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error}`);
  }
});

test('isEncrypted should detect encrypted values', () => {
  const encrypted = PIIProtectionService.encryptField('test');
  if (!PIIProtectionService.isEncrypted(encrypted)) {
    throw new Error('Should detect encrypted value');
  }
});

test('isEncrypted should reject non-encrypted values', () => {
  if (PIIProtectionService.isEncrypted('plaintext')) {
    throw new Error('Should not detect plaintext as encrypted');
  }
});

test('getEncryptedFieldNames should return field names', () => {
  const encryptedFields = {
    federalTaxIdNumber: 'encrypted...',
    ownerSsn: 'encrypted...',
    'principalOfficers.0.ssn': 'encrypted...',
  };
  
  const names = PIIProtectionService.getEncryptedFieldNames(encryptedFields);
  assertArrayLength(names, 3);
});

// Print Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary');
console.log('='.repeat(50));

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${results.length}`);

if (failed > 0) {
  console.log('\n❌ TESTS FAILED');
  console.log('\nFailed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED');
  process.exit(0);
}
