#!/usr/bin/env tsx
/**
 * Verify Email MFA Database Schema
 * Run this on fly.io after deployment to verify email MFA columns and indexes exist
 */

import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
}

async function verifyEmailMfaSchema() {
  console.log('🔍 Verifying Email MFA Database Schema...\n');

  try {
    // Check for email MFA columns
    console.log('📋 Checking Email MFA Columns:');
    const columns = await db.execute<ColumnInfo>(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' 
      AND column_name LIKE 'mfa_email%'
      ORDER BY column_name;
    `);

    const expectedColumns = [
      'mfa_email_enabled',
      'mfa_email_otp',
      'mfa_email_otp_expires_at',
      'mfa_email_otp_attempts',
      'mfa_email_last_sent_at',
      'mfa_email_send_count',
      'mfa_email_rate_limit_reset_at'
    ];

    const foundColumns = columns.rows.map((c: ColumnInfo) => c.column_name);
    
    for (const col of expectedColumns) {
      if (foundColumns.includes(col)) {
        console.log(`  ✅ ${col}`);
      } else {
        console.log(`  ❌ MISSING: ${col}`);
      }
    }

    // Check for email MFA indexes
    console.log('\n📊 Checking Email MFA Indexes:');
    const indexes = await db.execute<IndexInfo>(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      AND (
        indexname LIKE '%mfa_email%' 
        OR indexname LIKE '%mfa_status%'
      )
      ORDER BY indexname;
    `);

    const expectedIndexes = [
      'idx_users_mfa_email_enabled',
      'idx_users_mfa_email_last_sent',
      'idx_users_mfa_email_otp',
      'idx_users_mfa_email_otp_expires',
      'idx_users_mfa_status'
    ];

    const foundIndexes = indexes.rows.map((i: IndexInfo) => i.indexname);

    for (const idx of expectedIndexes) {
      if (foundIndexes.includes(idx)) {
        console.log(`  ✅ ${idx}`);
      } else {
        console.log(`  ⚠️  MISSING: ${idx} (optional, improves performance)`);
      }
    }

    // Check audit log enum values
    console.log('\n🔐 Checking Audit Log Enum Values:');
    const enumValues = await db.execute(sql`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
      AND enumlabel LIKE '%EMAIL%'
      ORDER BY enumlabel;
    `);

    const expectedEnums = [
      'MFA_EMAIL_ENABLED',
      'MFA_EMAIL_DISABLED',
      'MFA_EMAIL_OTP_SENT',
      'MFA_EMAIL_OTP_VERIFIED',
      'MFA_EMAIL_OTP_FAILED',
      'MFA_EMAIL_RATE_LIMIT_EXCEEDED',
      'MFA_METHOD_SWITCHED'
    ];

    const foundEnums = enumValues.rows.map((e: any) => e.enumlabel);

    for (const enumVal of expectedEnums) {
      if (foundEnums.includes(enumVal)) {
        console.log(`  ✅ ${enumVal}`);
      } else {
        console.log(`  ⚠️  MISSING: ${enumVal} (optional, for audit logging)`);
      }
    }

    // Test a sample query
    console.log('\n🧪 Testing Sample Query:');
    const testQuery = await db.execute(sql`
      SELECT 
        id, 
        email, 
        mfa_enabled, 
        mfa_email_enabled,
        mfa_required
      FROM users
      LIMIT 3;
    `);

    console.log(`  ✅ Successfully queried ${testQuery.rows.length} users`);
    console.log(`  ✅ Email MFA columns are accessible`);

    console.log('\n✨ Email MFA Schema Verification Complete!\n');
    console.log('Summary:');
    console.log(`  - Columns: ${foundColumns.length}/${expectedColumns.length} found`);
    console.log(`  - Indexes: ${foundIndexes.length}/${expectedIndexes.length} found`);
    console.log(`  - Audit Enums: ${foundEnums.length}/${expectedEnums.length} found`);

    if (foundColumns.length === expectedColumns.length) {
      console.log('\n🎉 All required email MFA columns exist!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some columns are missing. Run migrations manually.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error verifying schema:', error);
    process.exit(1);
  }
}

verifyEmailMfaSchema();

