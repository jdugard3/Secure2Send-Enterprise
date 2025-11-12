// Simple script to create invitation_codes table
// Run on Fly.io: fly ssh console -C "node scripts/create-invitation-codes-table.js"

import pg from 'pg';
const { Pool } = pg;

async function createTable() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Creating invitation_codes table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitation_codes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR UNIQUE NOT NULL,
        label VARCHAR NOT NULL,
        status invitation_code_status DEFAULT 'ACTIVE',
        created_by VARCHAR NOT NULL REFERENCES users(id),
        used_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        used_at TIMESTAMP
      );
    `);
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_invitation_codes_status ON invitation_codes(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_invitation_codes_created_by ON invitation_codes(created_by);`);
    
    console.log('✅ Table created successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTable();

