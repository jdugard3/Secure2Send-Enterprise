#!/usr/bin/env tsx
/**
 * Emergency database migration script to add missing merchant_application_id column
 * Run this directly on production if migrations failed
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fixDatabase() {
  try {
    console.log('🔧 Checking for missing merchant_application_id column...');
    
    // Check if column exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name = 'merchant_application_id'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Column missing. Adding merchant_application_id to documents table...');
      
      // Add the column
      await db.execute(sql`
        ALTER TABLE documents ADD COLUMN merchant_application_id VARCHAR
      `);
      console.log('✅ Column added');
      
      // Add foreign key constraint
      await db.execute(sql`
        ALTER TABLE documents ADD CONSTRAINT documents_merchant_application_id_fkey 
        FOREIGN KEY (merchant_application_id) REFERENCES merchant_applications(id)
      `);
      console.log('✅ Foreign key constraint added');
      
      // Add index
      await db.execute(sql`
        CREATE INDEX idx_documents_merchant_application_id ON documents(merchant_application_id)
      `);
      console.log('✅ Index created');
      
      console.log('✨ Database migration completed successfully!');
    } else {
      console.log('✅ Column already exists. No migration needed.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

fixDatabase();

