/**
 * Cleanup script for extracted document data
 * 
 * Deletes extracted document data that:
 * - Is older than EXTRACTED_DATA_EXPIRY_DAYS (default 30 days)
 * - Has never been reviewed/applied to an application
 * 
 * Usage:
 *   npm run cleanup:extracted-data
 * 
 * For Fly.io: This will be called via scheduled job
 * For Local: Can be run manually or via cron
 */

import { config } from 'dotenv';
config();

import { db } from '../server/db';
import { env } from '../server/env';
import { sql, lt, and, eq } from 'drizzle-orm';

// We'll create this table in Phase 3, but define the schema here for the cleanup script
// This is a placeholder - actual table will be in shared/schema.ts

interface ExtractedDocumentDataRow {
  id: string;
  extraction_timestamp: Date;
  user_reviewed: boolean;
  applied_to_application: boolean;
  expires_at: Date;
}

async function cleanupExtractedData() {
  console.log('\n🧹 Starting Cleanup of Extracted Document Data\n');
  console.log('='.repeat(80) + '\n');

  try {
    const expiryDays = env.EXTRACTED_DATA_EXPIRY_DAYS || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - expiryDays);

    console.log(`📅 Expiry Period: ${expiryDays} days`);
    console.log(`📅 Cutoff Date: ${cutoffDate.toISOString()}\n`);

    // Query for expired data that hasn't been reviewed/applied
    // Note: This will use the actual table once Phase 3 is complete
    // For now, this is the structure
    
    console.log('🔍 Searching for expired extracted data...\n');

    // Placeholder query - will be implemented in Phase 3
    // const expiredData = await db
    //   .select()
    //   .from(extractedDocumentData)
    //   .where(
    //     and(
    //       lt(extractedDocumentData.extractionTimestamp, cutoffDate),
    //       eq(extractedDocumentData.userReviewed, false),
    //       eq(extractedDocumentData.appliedToApplication, false)
    //     )
    //   );

    console.log('⚠️  Note: Cleanup functionality will be fully implemented in Phase 3');
    console.log('   when the extracted_document_data table is created.\n');

    console.log('✅ Cleanup script ready (awaiting database table creation)\n');
    console.log('='.repeat(80));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupExtractedData();

