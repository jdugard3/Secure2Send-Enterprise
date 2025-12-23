/**
 * Generate a secure encryption key for FIELD_ENCRYPTION_KEY
 * 
 * Usage:
 *   npm run generate:encryption-key
 * 
 * This generates a 64-character hex string (256 bits) suitable for AES-256-GCM encryption
 */

import { randomBytes } from 'crypto';

function generateEncryptionKey() {
  console.log('\n🔑 Generating Field Encryption Key\n');
  console.log('='.repeat(80) + '\n');

  // Generate 32 random bytes (256 bits)
  const keyBytes = randomBytes(32);
  const keyHex = keyBytes.toString('hex');

  console.log('✅ Generated 256-bit encryption key (64 hex characters)\n');
  console.log('Add this to your .env file:');
  console.log('='.repeat(80));
  console.log(`FIELD_ENCRYPTION_KEY=${keyHex}`);
  console.log('='.repeat(80));
  console.log('\n⚠️  IMPORTANT:');
  console.log('   - Keep this key SECRET');
  console.log('   - Never commit it to Git');
  console.log('   - Store it securely (use environment variables or secrets manager)');
  console.log('   - If compromised, regenerate and re-encrypt all data');
  console.log('   - Backup this key securely (encrypted backup recommended)\n');

  // Also copy to clipboard if possible (macOS)
  try {
    const { execSync } = require('child_process');
    execSync(`echo "${keyHex}" | pbcopy`, { stdio: 'ignore' });
    console.log('📋 Key copied to clipboard (macOS)\n');
  } catch (e) {
    // Ignore if pbcopy not available
  }

  console.log('='.repeat(80) + '\n');
}

generateEncryptionKey();

