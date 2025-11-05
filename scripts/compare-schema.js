/**
 * Comprehensive schema comparison tool
 * Compares the actual database schema with the expected schema from shared/schema.ts
 * 
 * Usage: node scripts/compare-schema.js
 */

import pg from 'pg';

// Extract column names from shared/schema.ts manually
// This is a comprehensive list based on the schema file
const EXPECTED_SCHEMA = {
  merchant_applications: [
    // Core fields
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
    
    // Enhanced DBA Information
    'product_or_service_sold', 'dba_website', 'multiple_locations',
    
    // Enhanced Corporate Information
    'legal_contact_name', 'legal_phone', 'legal_email', 'incorporation_state', 'entity_start_date',
    
    // Transaction and Volume
    'average_ticket', 'high_ticket', 'monthly_sales_volume', 'monthly_transactions',
    'annual_volume', 'annual_transactions',
    
    // Enhanced Banking Information
    'account_owner_first_name', 'account_owner_last_name', 'name_on_bank_account',
    'bank_officer_name', 'bank_officer_phone', 'bank_officer_email',
    
    // Enhanced Owner Information
    'owner_full_name', 'owner_first_name', 'owner_last_name', 'owner_officer', 'owner_title',
    'owner_ownership_percentage', 'owner_mobile_phone', 'owner_email', 'owner_ssn',
    'owner_birthday', 'owner_state_issued_id_number', 'owner_id_exp_date',
    'owner_issuing_state', 'owner_id_date_issued', 'owner_legal_address', 'owner_city',
    'owner_state', 'owner_zip', 'owner_country',
    
    // Financial Representative
    'financial_representative',
    
    // Business Operations
    'business_type', 'refund_guarantee', 'refund_days', 'pos_system',
    
    // Authorized Contacts
    'authorized_contacts',
    
    // Auto-filled fields for IRIS integration
    'processed_cards_past', 'previously_processed', 'automatic_billing', 'cardholder_data_3rd_party',
    
    // Corporate Resolution and Certification
    'corporate_resolution', 'merchant_signature', 'merchant_name', 'merchant_title',
    'merchant_date', 'agreement_accepted', 'corduro_signature', 'corduro_name',
    'corduro_title', 'corduro_date',
    
    // Metadata
    'created_at', 'updated_at', 'submitted_at', 'reviewed_at', 'reviewed_by',
    'rejection_reason', 'last_saved_at',
    
    // E-Signature tracking
    'e_signature_status', 'e_signature_application_id', 'e_signature_sent_at',
    'e_signature_completed_at', 'signed_document_id',
  ],
  
  documents: [
    'id', 'filename', 'original_name', 'file_size', 'mime_type', 'file_path',
    'document_type', 'status', 'rejection_reason', 'client_id', 
    'merchant_application_id', 'uploaded_at', 'reviewed_at', 'r2_key', 
    'r2_url', 'encryption_key_id',
  ],
  
  clients: [
    'id', 'user_id', 'status', 'iris_lead_id', 'created_at', 'updated_at',
  ],
};

async function compareSchema() {
  const client = new pg.Client(process.env.DATABASE_URL);
  
  try {
    console.log('🔍 Comparing database schema with expected schema...\n');
    console.log('='.repeat(80));
    await client.connect();
    
    let totalMissing = 0;
    let totalExtra = 0;
    let hasIssues = false;
    
    for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
      console.log(`\n📋 Table: ${tableName}`);
      console.log('─'.repeat(80));
      
      // Check if table exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);
      
      if (!tableExists.rows[0].exists) {
        console.log(`❌ Table does not exist!`);
        hasIssues = true;
        totalMissing += expectedColumns.length;
        continue;
      }
      
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
      
      totalMissing += missingColumns.length;
      totalExtra += extraColumns.length;
      
      if (missingColumns.length > 0) {
        hasIssues = true;
        console.log(`❌ Missing columns (${missingColumns.length}):`);
        missingColumns.forEach(col => {
          console.log(`   - ${col}`);
        });
      } else {
        console.log(`✅ All expected columns present`);
      }
      
      if (extraColumns.length > 0) {
        console.log(`\n⚠️  Extra columns (${extraColumns.length}) - not in schema:`);
        extraColumns.forEach(col => {
          console.log(`   - ${col}`);
        });
      }
      
      console.log(`\n   Summary: ${result.rows.length} actual columns, ${expectedColumns.length} expected columns`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 Overall Summary:`);
    console.log(`   Missing columns: ${totalMissing}`);
    console.log(`   Extra columns: ${totalExtra}`);
    
    if (hasIssues) {
      console.log('\n❌ Schema mismatch detected!');
      console.log('\n💡 To fix:');
      console.log('   1. Run: npm run db:push');
      console.log('   2. Or use: node scripts/fix-db-migration.js');
      console.log('   3. Check logs from release_command to see why db:push failed');
      process.exit(1);
    } else {
      console.log('\n✅ Schema matches expected schema perfectly!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Error comparing schema:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  compareSchema();
}

export { compareSchema };

