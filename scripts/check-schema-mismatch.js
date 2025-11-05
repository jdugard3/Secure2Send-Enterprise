/**
 * Schema mismatch detection script
 * Compares the actual database schema with the expected schema from shared/schema.ts
 * This helps identify missing columns, incorrect types, etc.
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Expected schema based on shared/schema.ts
const EXPECTED_SCHEMA = {
  merchant_applications: [
    'id', 'client_id', 'status', 'iris_lead_id',
    // Business Information
    'legal_business_name', 'dba_business_name', 'billing_address', 'location_address',
    'city', 'state', 'zip', 'business_phone', 'business_fax_number', 'customer_service_phone',
    'federal_tax_id_number', 'contact_name', 'contact_phone_number', 'contact_email',
    'website_address',
    // Business Description
    'processing_categories', 'ownership_type',
    // Owner/Principal Officers
    'principal_officers',
    // Settlement/Banking
    'bank_name', 'aba_routing_number', 'account_name', 'dda_number',
    // Fee Schedule Information
    'fee_schedule_data',
    // Supporting Information
    'supporting_information',
    // Equipment Information
    'equipment_data',
    // Beneficial Ownership
    'beneficial_owners',
    // IRIS CRM Integration Fields
    'mpa_signed_date', 'sales_rep_name',
    // Timestamps
    'created_at', 'updated_at', 'submitted_at', 'reviewed_at', 'last_saved_at',
    'reviewed_by',
    // E-Signature tracking
    'e_signature_status', 'e_signature_application_id', 'e_signature_sent_at',
    'e_signature_completed_at', 'signed_document_id',
  ],
  documents: [
    'id', 'client_id', 'merchant_application_id', 'original_name', 'stored_name',
    'file_path', 'file_size', 'mime_type', 'uploaded_at', 'encryption_key_id',
  ],
  clients: [
    'id', 'user_id', 'company_name', 'created_at', 'updated_at', 'iris_lead_id',
  ],
};

async function checkSchemaMismatch() {
  const client = new pg.Client(process.env.DATABASE_URL);
  
  try {
    console.log('🔍 Checking database schema against expected schema...\n');
    await client.connect();
    
    let hasIssues = false;
    
    for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
      console.log(`\n📋 Checking table: ${tableName}`);
      console.log('─'.repeat(60));
      
      // Get actual columns from database
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      const actualColumns = new Set(result.rows.map(row => row.column_name));
      const expectedColumnsSet = new Set(expectedColumns);
      
      // Find missing columns
      const missingColumns = expectedColumns.filter(col => !actualColumns.has(col));
      const extraColumns = Array.from(actualColumns).filter(col => !expectedColumnsSet.has(col));
      
      if (missingColumns.length > 0) {
        hasIssues = true;
        console.log(`❌ Missing columns (${missingColumns.length}):`);
        missingColumns.forEach(col => {
          console.log(`   - ${col}`);
        });
      }
      
      if (extraColumns.length > 0) {
        console.log(`⚠️  Extra columns (${extraColumns.length}) - not in schema:`);
        extraColumns.forEach(col => {
          console.log(`   - ${col}`);
        });
      }
      
      if (missingColumns.length === 0 && extraColumns.length === 0) {
        console.log(`✅ All expected columns present (${expectedColumns.length} columns)`);
      }
      
      // Show column details for debugging
      if (missingColumns.length > 0) {
        console.log(`\n   Actual columns in database (${actualColumns.size}):`);
        result.rows.forEach(row => {
          const marker = expectedColumnsSet.has(row.column_name) ? '✅' : '⚠️';
          console.log(`   ${marker} ${row.column_name} (${row.data_type})`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    if (hasIssues) {
      console.log('❌ Schema mismatch detected!');
      console.log('\nTo fix, run: npm run db:push');
      console.log('Or use the emergency migration script: node scripts/fix-db-migration.js');
      process.exit(1);
    } else {
      console.log('✅ Schema matches expected schema!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking schema:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkSchemaMismatch();

