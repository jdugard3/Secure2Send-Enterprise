import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixInvitationCodesMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Fixing invitation codes migration...');

    // Add audit action enum values
    console.log('Adding INVITATION_CODE_CREATED to audit_action enum...');
    await pool.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INVITATION_CODE_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
              ALTER TYPE audit_action ADD VALUE 'INVITATION_CODE_CREATED';
              RAISE NOTICE 'Added INVITATION_CODE_CREATED';
          ELSE
              RAISE NOTICE 'INVITATION_CODE_CREATED already exists';
          END IF;
      END $$;
    `);

    console.log('Adding INVITATION_CODE_USED to audit_action enum...');
    await pool.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INVITATION_CODE_USED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
              ALTER TYPE audit_action ADD VALUE 'INVITATION_CODE_USED';
              RAISE NOTICE 'Added INVITATION_CODE_USED';
          ELSE
              RAISE NOTICE 'INVITATION_CODE_USED already exists';
          END IF;
      END $$;
    `);

    // Create invitation code status enum if it doesn't exist
    console.log('Creating invitation_code_status enum...');
    await pool.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_code_status') THEN
              CREATE TYPE invitation_code_status AS ENUM ('ACTIVE', 'USED', 'EXPIRED');
              RAISE NOTICE 'Created invitation_code_status enum';
          ELSE
              RAISE NOTICE 'invitation_code_status enum already exists';
          END IF;
      END $$;
    `);

    // Check if invitation_codes table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invitation_codes'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('Creating invitation_codes table...');
      await pool.query(`
        CREATE TABLE invitation_codes (
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

      await pool.query(`CREATE INDEX idx_invitation_codes_code ON invitation_codes(code);`);
      await pool.query(`CREATE INDEX idx_invitation_codes_status ON invitation_codes(status);`);
      await pool.query(`CREATE INDEX idx_invitation_codes_created_by ON invitation_codes(created_by);`);
      console.log('✅ Created invitation_codes table with indexes');
    } else {
      console.log('✅ invitation_codes table already exists');
    }

    console.log('✅ Migration fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixInvitationCodesMigration()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

