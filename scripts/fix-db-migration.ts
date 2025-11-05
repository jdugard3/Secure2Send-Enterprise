#!/usr/bin/env tsx
/**
 * Emergency database migration script to add missing columns from migration 010
 * Run this directly on production if migrations failed
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fixDatabase() {
  try {
    console.log('🔧 Running emergency database migration...');
    
    // Check and add iris_lead_id to merchant_applications
    console.log('\n1️⃣ Checking merchant_applications.iris_lead_id...');
    const irisLeadCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'merchant_applications' 
      AND column_name = 'iris_lead_id'
    `);
    
    if (irisLeadCheck.rows.length === 0) {
      console.log('   ❌ Column missing. Adding iris_lead_id to merchant_applications...');
      await db.execute(sql`ALTER TABLE merchant_applications ADD COLUMN iris_lead_id VARCHAR`);
      console.log('   ✅ Column added');
      
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_merchant_applications_iris_lead_id ON merchant_applications(iris_lead_id)`);
      console.log('   ✅ Index created');
    } else {
      console.log('   ✅ Column already exists');
    }
    
    // Check and add merchant_application_id to documents
    console.log('\n2️⃣ Checking documents.merchant_application_id...');
    const merchantAppCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name = 'merchant_application_id'
    `);
    
    if (merchantAppCheck.rows.length === 0) {
      console.log('   ❌ Column missing. Adding merchant_application_id to documents...');
      await db.execute(sql`ALTER TABLE documents ADD COLUMN merchant_application_id VARCHAR`);
      console.log('   ✅ Column added');
      
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_documents_merchant_application_id ON documents(merchant_application_id)`);
      console.log('   ✅ Index created');
    } else {
      console.log('   ✅ Column already exists');
    }
    
    console.log('\n✨ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

fixDatabase();

