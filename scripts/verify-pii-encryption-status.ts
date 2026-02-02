#!/usr/bin/env npx tsx

/**
 * Quick verification script to check PII encryption status in production
 * 
 * Usage:
 *   npm run verify:pii-status
 * 
 * Or from Fly.io production:
 *   fly ssh console -a secure2send -C "npm run verify:pii-status"
 */

import { config } from 'dotenv';
config();

import { pool } from '../server/db';

interface VerificationResult {
  totalApplications: number;
  encryptedApplications: number;
  unencryptedApplications: number;
  encryptionPercentage: number;
  sampleEncryptedFields: string[];
  keyConfigured: boolean;
  lastEncryptedAt?: Date;
}

async function verifyPIIEncryptionStatus(): Promise<VerificationResult> {
  console.log('\n🔍 Verifying PII Encryption Status\n');
  console.log('='.repeat(80));

  const result: VerificationResult = {
    totalApplications: 0,
    encryptedApplications: 0,
    unencryptedApplications: 0,
    encryptionPercentage: 0,
    sampleEncryptedFields: [],
    keyConfigured: !!process.env.FIELD_ENCRYPTION_KEY,
  };

  try {
    // Check FIELD_ENCRYPTION_KEY
    console.log('\n1. Encryption Key Configuration:');
    if (result.keyConfigured) {
      console.log('   ✅ FIELD_ENCRYPTION_KEY is set');
      const keyLength = process.env.FIELD_ENCRYPTION_KEY?.length || 0;
      if (keyLength === 64) {
        console.log('   ✅ Key length is correct (64 characters)');
      } else {
        console.log(`   ⚠️  Key length: ${keyLength} (expected 64)`);
      }
    } else {
      console.log('   ❌ FIELD_ENCRYPTION_KEY is NOT set');
      console.log('      New data will NOT be encrypted!');
    }

    // Count total applications
    const totalQuery = await pool.query('SELECT COUNT(*) as count FROM merchant_applications');
    result.totalApplications = parseInt(totalQuery.rows[0].count);

    // Count encrypted applications
    const encryptedQuery = await pool.query(
      'SELECT COUNT(*) as count FROM merchant_applications WHERE has_encrypted_data = true'
    );
    result.encryptedApplications = parseInt(encryptedQuery.rows[0].count);
    result.unencryptedApplications = result.totalApplications - result.encryptedApplications;

    if (result.totalApplications > 0) {
      result.encryptionPercentage = (result.encryptedApplications / result.totalApplications) * 100;
    }

    // Get last encrypted timestamp
    const lastEncryptedQuery = await pool.query(
      'SELECT MAX(encrypted_at) as last_encrypted FROM merchant_applications WHERE has_encrypted_data = true'
    );
    if (lastEncryptedQuery.rows[0].last_encrypted) {
      result.lastEncryptedAt = new Date(lastEncryptedQuery.rows[0].last_encrypted);
    }

    // Get sample of encrypted field keys (not values!)
    const sampleQuery = await pool.query(
      `SELECT encrypted_fields 
       FROM merchant_applications 
       WHERE has_encrypted_data = true 
       LIMIT 1`
    );
    if (sampleQuery.rows.length > 0 && sampleQuery.rows[0].encrypted_fields) {
      const encryptedFields = sampleQuery.rows[0].encrypted_fields;
      result.sampleEncryptedFields = Object.keys(encryptedFields);
    }

    // Display results
    console.log('\n2. Database Encryption Status:');
    console.log(`   Total Applications: ${result.totalApplications}`);
    console.log(`   Encrypted: ${result.encryptedApplications} (${result.encryptionPercentage.toFixed(1)}%)`);
    console.log(`   Unencrypted: ${result.unencryptedApplications}`);

    if (result.lastEncryptedAt) {
      console.log(`   Last Encrypted: ${result.lastEncryptedAt.toISOString()}`);
    }

    if (result.sampleEncryptedFields.length > 0) {
      console.log('\n3. Encrypted Fields (sample):');
      result.sampleEncryptedFields.forEach(field => {
        console.log(`   - ${field}`);
      });
    }

    console.log('\n4. Summary:');
    if (result.encryptionPercentage === 100 && result.keyConfigured) {
      console.log('   ✅ All merchant applications are encrypted');
      console.log('   ✅ Encryption key is configured');
      console.log('   ✅ System is fully protected');
    } else if (result.encryptionPercentage === 100 && !result.keyConfigured) {
      console.log('   ⚠️  Existing data is encrypted, but key is missing');
      console.log('   ⚠️  New/updated data will NOT be encrypted!');
      console.log('   📝 Action: Set FIELD_ENCRYPTION_KEY in environment');
    } else if (result.encryptionPercentage > 0 && result.keyConfigured) {
      console.log(`   ⚠️  Partial encryption: ${result.encryptionPercentage.toFixed(1)}%`);
      console.log(`   📝 Action: Run migration to encrypt remaining ${result.unencryptedApplications} records`);
      console.log('      Command: npm run migrate:encrypt-pii');
    } else if (result.keyConfigured) {
      console.log('   ⚠️  No data encrypted yet');
      console.log('   📝 Action: Run migration to encrypt existing data');
      console.log('      Command: npm run migrate:encrypt-pii');
    } else {
      console.log('   ❌ Encryption is NOT configured');
      console.log('   📝 Action: Set FIELD_ENCRYPTION_KEY and run migration');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    return result;

  } catch (error) {
    console.error('\n❌ Error checking encryption status:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run verification
verifyPIIEncryptionStatus()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
