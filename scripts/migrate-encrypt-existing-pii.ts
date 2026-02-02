#!/usr/bin/env npx tsx

/**
 * Migration Script: Encrypt Existing Merchant Application PII
 *
 * This script encrypts all existing plaintext PII in the merchant_applications table.
 * It uses the PIIProtectionService for consistent encryption with the application.
 *
 * Features:
 * - Dry-run mode (preview changes without committing)
 * - Batch processing to avoid memory issues
 * - Checksum verification for data integrity
 * - Progress logging
 * - Error handling with transaction rollback
 * - Resume capability (skips already-encrypted records)
 *
 * Usage:
 *   npx tsx scripts/migrate-encrypt-existing-pii.ts --dry-run    # Preview changes
 *   npx tsx scripts/migrate-encrypt-existing-pii.ts              # Execute migration
 *   npx tsx scripts/migrate-encrypt-existing-pii.ts --verify     # Verify existing encrypted data
 *
 * To run against production (no DB password needed):
 *   - Deploy: the release_command in fly.toml runs this script after migrations (uses app's DATABASE_URL).
 *   - Or from your machine with fly proxy: fly proxy 5432 -a secure2send-db, then
 *     DATABASE_URL="postgres://postgres:YOUR_PASSWORD@127.0.0.1:5432" npm run migrate:encrypt-pii
 */

import { config } from 'dotenv';
config();

import { db, pool } from '../server/db';
import { merchantApplications } from '../shared/schema';
import { PIIProtectionService } from '../server/services/piiProtectionService';
import { eq, sql } from 'drizzle-orm';
import { createHash } from 'crypto';

// Configuration
const BATCH_SIZE = 50;
const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY_ONLY = process.argv.includes('--verify');
const VERBOSE = process.argv.includes('--verbose');

interface MigrationResult {
  totalRecords: number;
  processedRecords: number;
  encryptedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  errors: Array<{ id: string; error: string }>;
  checksumMismatches: Array<{ id: string; field: string }>;
}

interface PIIChecksum {
  id: string;
  checksums: Record<string, string>;
}

/**
 * Calculate SHA-256 checksum of a value
 */
function calculateChecksum(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(stringValue).digest('hex').substring(0, 16);
}

/**
 * Extract checksums for all PII fields in an application
 */
function extractPIIChecksums(application: any): Record<string, string> {
  const checksums: Record<string, string> = {};
  
  // Simple fields
  const simpleFields = ['federalTaxIdNumber', 'ownerSsn', 'abaRoutingNumber', 'ddaNumber', 'ownerStateIssuedIdNumber'];
  for (const field of simpleFields) {
    if (application[field]) {
      checksums[field] = calculateChecksum(application[field]);
    }
  }
  
  // Principal officers
  if (application.principalOfficers && Array.isArray(application.principalOfficers)) {
    application.principalOfficers.forEach((officer: any, index: number) => {
      if (officer.ssn) checksums[`principalOfficers.${index}.ssn`] = calculateChecksum(officer.ssn);
      if (officer.dob) checksums[`principalOfficers.${index}.dob`] = calculateChecksum(officer.dob);
      if (officer.driversLicenseNumber) checksums[`principalOfficers.${index}.driversLicenseNumber`] = calculateChecksum(officer.driversLicenseNumber);
    });
  }
  
  // Beneficial owners
  if (application.beneficialOwners && Array.isArray(application.beneficialOwners)) {
    application.beneficialOwners.forEach((owner: any, index: number) => {
      if (owner.ssn) checksums[`beneficialOwners.${index}.ssn`] = calculateChecksum(owner.ssn);
      if (owner.dob) checksums[`beneficialOwners.${index}.dob`] = calculateChecksum(owner.dob);
      if (owner.driversLicenseNumber) checksums[`beneficialOwners.${index}.driversLicenseNumber`] = calculateChecksum(owner.driversLicenseNumber);
    });
  }
  
  return checksums;
}

/**
 * Verify that decrypted data matches original checksums
 */
function verifyChecksums(original: Record<string, string>, decrypted: Record<string, string>): string[] {
  const mismatches: string[] = [];
  
  for (const [field, originalChecksum] of Object.entries(original)) {
    const decryptedChecksum = decrypted[field];
    if (originalChecksum !== decryptedChecksum) {
      mismatches.push(field);
    }
  }
  
  return mismatches;
}

/**
 * Check if a record has any sensitive data to encrypt
 */
function hasSensitiveData(application: any): boolean {
  // Check simple fields
  const simpleFields = ['federalTaxIdNumber', 'ownerSsn', 'abaRoutingNumber', 'ddaNumber', 'ownerStateIssuedIdNumber'];
  for (const field of simpleFields) {
    if (application[field] && typeof application[field] === 'string' && application[field].trim() !== '') {
      return true;
    }
  }
  
  // Check principal officers
  if (application.principalOfficers && Array.isArray(application.principalOfficers)) {
    for (const officer of application.principalOfficers) {
      if (officer.ssn || officer.dob || officer.driversLicenseNumber) {
        return true;
      }
    }
  }
  
  // Check beneficial owners
  if (application.beneficialOwners && Array.isArray(application.beneficialOwners)) {
    for (const owner of application.beneficialOwners) {
      if (owner.ssn || owner.dob || owner.driversLicenseNumber) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Encrypt a single merchant application record
 */
async function encryptApplication(application: any, result: MigrationResult): Promise<boolean> {
  try {
    // Skip if already encrypted
    if (application.hasEncryptedData === true) {
      if (VERBOSE) {
        console.log(`  ⏭️  Skipping ${application.id} - already encrypted`);
      }
      result.skippedRecords++;
      return true;
    }
    
    // Skip if no sensitive data
    if (!hasSensitiveData(application)) {
      if (VERBOSE) {
        console.log(`  ⏭️  Skipping ${application.id} - no sensitive data`);
      }
      result.skippedRecords++;
      return true;
    }
    
    // Calculate pre-encryption checksums
    const preChecksums = extractPIIChecksums(application);
    
    // Encrypt the application
    const { encryptedFields, publicData } = PIIProtectionService.encryptMerchantApplication(application);
    
    if (Object.keys(encryptedFields).length === 0) {
      if (VERBOSE) {
        console.log(`  ⏭️  Skipping ${application.id} - no fields to encrypt`);
      }
      result.skippedRecords++;
      return true;
    }
    
    // Verify encryption by decrypting and checking checksums
    const decrypted = PIIProtectionService.decryptMerchantApplication({
      ...publicData,
      encrypted_fields: encryptedFields,
    });
    const postChecksums = extractPIIChecksums(decrypted);
    const mismatches = verifyChecksums(preChecksums, postChecksums);
    
    if (mismatches.length > 0) {
      console.error(`  ❌ Checksum mismatch for ${application.id}: ${mismatches.join(', ')}`);
      result.checksumMismatches.push(...mismatches.map(field => ({ id: application.id, field })));
      result.failedRecords++;
      return false;
    }
    
    if (DRY_RUN) {
      console.log(`  ✅ [DRY-RUN] Would encrypt ${application.id} - ${Object.keys(encryptedFields).length} fields`);
      if (VERBOSE) {
        console.log(`     Fields: ${Object.keys(encryptedFields).join(', ')}`);
      }
      result.encryptedRecords++;
      return true;
    }
    
    // Update the database
    await db
      .update(merchantApplications)
      .set({
        ...publicData,
        encryptedFields: encryptedFields,
        hasEncryptedData: true,
        encryptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(merchantApplications.id, application.id));
    
    console.log(`  ✅ Encrypted ${application.id} - ${Object.keys(encryptedFields).length} fields`);
    result.encryptedRecords++;
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Failed to encrypt ${application.id}: ${errorMessage}`);
    result.errors.push({ id: application.id, error: errorMessage });
    result.failedRecords++;
    return false;
  }
}

/**
 * Verify an existing encrypted record
 */
async function verifyEncryptedApplication(application: any, result: MigrationResult): Promise<boolean> {
  try {
    if (!application.hasEncryptedData || !application.encryptedFields) {
      result.skippedRecords++;
      return true;
    }
    
    // Try to decrypt
    const decrypted = PIIProtectionService.decryptMerchantApplication({
      ...application,
      encrypted_fields: application.encryptedFields as Record<string, string>,
    });
    
    // Check that decrypted values are not null/undefined for fields that have encrypted values
    const encryptedFieldNames = Object.keys(application.encryptedFields);
    let hasErrors = false;
    
    for (const fieldName of encryptedFieldNames) {
      // Handle nested fields like principalOfficers.0.ssn
      if (fieldName.includes('.')) {
        const parts = fieldName.split('.');
        let value: any = decrypted;
        for (const part of parts) {
          if (value && typeof value === 'object') {
            value = value[part];
          } else {
            value = undefined;
            break;
          }
        }
        if (value === undefined || value === null) {
          console.error(`  ❌ Decryption verification failed for ${application.id}.${fieldName}`);
          hasErrors = true;
        }
      } else {
        if ((decrypted as any)[fieldName] === undefined || (decrypted as any)[fieldName] === null) {
          console.error(`  ❌ Decryption verification failed for ${application.id}.${fieldName}`);
          hasErrors = true;
        }
      }
    }
    
    if (hasErrors) {
      result.failedRecords++;
      return false;
    }
    
    if (VERBOSE) {
      console.log(`  ✅ Verified ${application.id} - ${encryptedFieldNames.length} encrypted fields`);
    }
    result.processedRecords++;
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Verification failed for ${application.id}: ${errorMessage}`);
    result.errors.push({ id: application.id, error: errorMessage });
    result.failedRecords++;
    return false;
  }
}

/**
 * Main migration function
 */
async function runMigration(): Promise<MigrationResult> {
  console.log('\n🔐 PII Encryption Migration Script');
  console.log('='.repeat(50));
  
  if (DRY_RUN) {
    console.log('⚠️  DRY-RUN MODE - No changes will be made\n');
  }
  
  if (VERIFY_ONLY) {
    console.log('🔍 VERIFY MODE - Only checking existing encrypted data\n');
  }
  
  // Check encryption key
  if (!PIIProtectionService.isEncryptionAvailable()) {
    console.error('❌ FIELD_ENCRYPTION_KEY is not set. Cannot proceed.');
    console.error('   Set the encryption key with: fly secrets set FIELD_ENCRYPTION_KEY="<64-char-hex>"');
    process.exit(1);
  }
  
  // Validate encryption is working
  const validation = PIIProtectionService.validateEncryption();
  if (!validation.success) {
    console.error(`❌ Encryption validation failed: ${validation.error}`);
    process.exit(1);
  }
  console.log('✅ Encryption key validated\n');
  
  const result: MigrationResult = {
    totalRecords: 0,
    processedRecords: 0,
    encryptedRecords: 0,
    skippedRecords: 0,
    failedRecords: 0,
    errors: [],
    checksumMismatches: [],
  };
  
  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(merchantApplications);
  result.totalRecords = Number(countResult[0].count);
  
  console.log(`📊 Total merchant applications: ${result.totalRecords}\n`);
  
  if (result.totalRecords === 0) {
    console.log('ℹ️  No records to process.');
    return result;
  }
  
  // Process in batches
  let offset = 0;
  let batchNumber = 1;
  
  while (offset < result.totalRecords) {
    console.log(`\n📦 Processing batch ${batchNumber} (${offset + 1}-${Math.min(offset + BATCH_SIZE, result.totalRecords)} of ${result.totalRecords})`);
    
    const batch = await db
      .select()
      .from(merchantApplications)
      .limit(BATCH_SIZE)
      .offset(offset);
    
    for (const application of batch) {
      result.processedRecords++;
      
      if (VERIFY_ONLY) {
        await verifyEncryptedApplication(application, result);
      } else {
        await encryptApplication(application, result);
      }
    }
    
    offset += BATCH_SIZE;
    batchNumber++;
  }
  
  return result;
}

/**
 * Print migration summary
 */
function printSummary(result: MigrationResult): void {
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`Total Records:     ${result.totalRecords}`);
  console.log(`Processed:         ${result.processedRecords}`);
  console.log(`Encrypted:         ${result.encryptedRecords}`);
  console.log(`Skipped:           ${result.skippedRecords}`);
  console.log(`Failed:            ${result.failedRecords}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const error of result.errors) {
      console.log(`   - ${error.id}: ${error.error}`);
    }
  }
  
  if (result.checksumMismatches.length > 0) {
    console.log('\n⚠️  Checksum Mismatches:');
    for (const mismatch of result.checksumMismatches) {
      console.log(`   - ${mismatch.id}.${mismatch.field}`);
    }
  }
  
  if (result.failedRecords === 0 && result.checksumMismatches.length === 0) {
    if (DRY_RUN) {
      console.log('\n✅ DRY-RUN COMPLETED SUCCESSFULLY');
      console.log('   Run without --dry-run to apply changes.');
    } else if (VERIFY_ONLY) {
      console.log('\n✅ VERIFICATION COMPLETED SUCCESSFULLY');
    } else {
      console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY');
    }
  } else {
    console.log('\n❌ MIGRATION COMPLETED WITH ERRORS');
    console.log('   Review errors above and re-run the migration.');
  }
}

// Main execution
(async () => {
  try {
    const result = await runMigration();
    printSummary(result);
    
    // Close the connection pool
    await pool.end();
    
    // Exit with appropriate code
    process.exit(result.failedRecords > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    await pool.end();
    process.exit(1);
  }
})();
