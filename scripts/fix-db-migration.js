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
    
    // Check and add e-signature columns to merchant_applications (migration 011)
    console.log('\n3️⃣ Checking merchant_applications e-signature columns...');
    
    // Check each column individually
    const esigColumns = [
      { name: 'e_signature_status', sql: `ALTER TABLE merchant_applications ADD COLUMN e_signature_status TEXT DEFAULT 'NOT_SENT' CHECK (e_signature_status IN ('NOT_SENT', 'PENDING', 'SIGNED', 'DECLINED', 'EXPIRED'))` },
      { name: 'e_signature_application_id', sql: `ALTER TABLE merchant_applications ADD COLUMN e_signature_application_id TEXT` },
      { name: 'e_signature_sent_at', sql: `ALTER TABLE merchant_applications ADD COLUMN e_signature_sent_at TIMESTAMP` },
      { name: 'e_signature_completed_at', sql: `ALTER TABLE merchant_applications ADD COLUMN e_signature_completed_at TIMESTAMP` },
      { name: 'signed_document_id', sql: `ALTER TABLE merchant_applications ADD COLUMN signed_document_id VARCHAR` },
    ];
    
    for (const col of esigColumns) {
      const check = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'merchant_applications' 
        AND column_name = $1
      `, [col.name]);
      
      if (check.rows.length === 0) {
        console.log(`   ❌ Column ${col.name} missing. Adding...`);
        await client.query(col.sql);
        console.log(`   ✅ Added ${col.name}`);
      } else {
        console.log(`   ✅ Column ${col.name} already exists`);
      }
    }
    
    // Create indexes if they don't exist
    await client.query(`CREATE INDEX IF NOT EXISTS idx_merchant_applications_esignature_app_id ON merchant_applications(e_signature_application_id) WHERE e_signature_application_id IS NOT NULL`);
    console.log('   ✅ Created/verified index on e_signature_application_id');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_merchant_applications_esignature_status ON merchant_applications(e_signature_status) WHERE e_signature_status != 'NOT_SENT'`);
    console.log('   ✅ Created/verified index on e_signature_status');
    
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

