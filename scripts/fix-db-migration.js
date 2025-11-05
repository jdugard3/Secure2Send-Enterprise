/**
 * Emergency database migration script to add missing columns from migration 010
 * Run this directly on production if migrations failed
 */

import pg from 'pg';

async function fixDatabase() {
  const client = new pg.Client(process.env.DATABASE_URL);
  
  try {
    console.log('🔧 Running emergency database migration...');
    await client.connect();
    
    // Check and add iris_lead_id to merchant_applications
    console.log('\n1️⃣ Checking merchant_applications.iris_lead_id...');
    const irisLeadCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'merchant_applications' 
      AND column_name = 'iris_lead_id'
    `);
    
    if (irisLeadCheck.rows.length === 0) {
      console.log('   ❌ Column missing. Adding iris_lead_id to merchant_applications...');
      await client.query(`ALTER TABLE merchant_applications ADD COLUMN iris_lead_id VARCHAR`);
      console.log('   ✅ Column added');
      
      await client.query(`CREATE INDEX IF NOT EXISTS idx_merchant_applications_iris_lead_id ON merchant_applications(iris_lead_id)`);
      console.log('   ✅ Index created');
    } else {
      console.log('   ✅ Column already exists');
    }
    
    // Check and add merchant_application_id to documents
    console.log('\n2️⃣ Checking documents.merchant_application_id...');
    const merchantAppCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name = 'merchant_application_id'
    `);
    
    if (merchantAppCheck.rows.length === 0) {
      console.log('   ❌ Column missing. Adding merchant_application_id to documents...');
      await client.query(`ALTER TABLE documents ADD COLUMN merchant_application_id VARCHAR`);
      console.log('   ✅ Column added');
      
      await client.query(`CREATE INDEX IF NOT EXISTS idx_documents_merchant_application_id ON documents(merchant_application_id)`);
      console.log('   ✅ Index created');
    } else {
      console.log('   ✅ Column already exists');
    }
    
    console.log('\n✨ Database migration completed successfully!');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixDatabase();

