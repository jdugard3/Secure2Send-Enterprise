/**
 * Verify Production Database Migrations
 * 
 * This script checks which migrations have been applied to the production database
 * and compares them with the migrations in the codebase.
 * 
 * Usage:
 *   tsx scripts/verify-production-migrations.ts
 */

import { Pool } from 'pg';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  filename: string;
  executed_at: Date;
}

async function verifyMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('\nTo check production migrations:');
    console.log('  fly ssh console');
    console.log('  tsx scripts/verify-production-migrations.ts');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    console.log('🔍 Verifying Production Database Migrations\n');
    console.log('═'.repeat(70));
    
    // Get all SQL migration files from codebase
    const migrationsDir = join(__dirname, '../migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`\n📁 Found ${sqlFiles.length} migration files in codebase\n`);
    
    // Check if migrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = '_migrations'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  WARNING: _migrations table does not exist!');
      console.log('   This means migrations have never been run on this database.');
      console.log('\n📋 Migrations that need to be applied:');
      sqlFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      console.log('\n💡 Run migrations with: npm run migrate');
      process.exit(0);
    }
    
    // Get executed migrations from database
    const result = await client.query<Migration>(`
      SELECT filename, executed_at 
      FROM _migrations 
      ORDER BY executed_at ASC
    `);
    
    const executedMigrations = new Map(
      result.rows.map(row => [row.filename, row.executed_at])
    );
    
    console.log(`✅ Found ${executedMigrations.size} executed migrations in database\n`);
    console.log('═'.repeat(70));
    
    // Compare codebase with database
    const pending: string[] = [];
    const applied: Array<{ filename: string; executed_at: Date }> = [];
    
    sqlFiles.forEach(file => {
      if (executedMigrations.has(file)) {
        applied.push({
          filename: file,
          executed_at: executedMigrations.get(file)!
        });
      } else {
        pending.push(file);
      }
    });
    
    // Display applied migrations
    console.log('\n✅ Applied Migrations:\n');
    if (applied.length === 0) {
      console.log('   (none)');
    } else {
      applied.forEach((migration, index) => {
        const date = new Date(migration.executed_at).toISOString().split('T')[0];
        const time = new Date(migration.executed_at).toISOString().split('T')[1].split('.')[0];
        console.log(`   ${index + 1}. ${migration.filename}`);
        console.log(`      Executed: ${date} ${time}`);
      });
    }
    
    // Display pending migrations
    console.log('\n⏳ Pending Migrations:\n');
    if (pending.length === 0) {
      console.log('   ✨ All migrations are up to date!');
    } else {
      pending.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file} ⚠️  NOT APPLIED`);
      });
      console.log(`\n⚠️  WARNING: ${pending.length} migration(s) need to be applied!`);
      console.log('\n💡 To apply pending migrations:');
      console.log('   npm run migrate');
    }
    
    // Check for migrations in database but not in codebase
    const extraMigrations: string[] = [];
    executedMigrations.forEach((_, filename) => {
      if (!sqlFiles.includes(filename)) {
        extraMigrations.push(filename);
      }
    });
    
    if (extraMigrations.length > 0) {
      console.log('\n⚠️  Migrations in Database but NOT in Codebase:\n');
      extraMigrations.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      console.log('\n   This could indicate:');
      console.log('   - Migration files were deleted from codebase');
      console.log('   - Database is from a different branch');
      console.log('   - Manual migrations were applied');
    }
    
    console.log('\n' + '═'.repeat(70));
    
    // Summary
    console.log('\n📊 Summary:\n');
    console.log(`   Total migrations in codebase: ${sqlFiles.length}`);
    console.log(`   Applied to database: ${applied.length}`);
    console.log(`   Pending: ${pending.length}`);
    if (extraMigrations.length > 0) {
      console.log(`   Extra in database: ${extraMigrations.length}`);
    }
    
    // Status
    if (pending.length === 0 && extraMigrations.length === 0) {
      console.log('\n✅ Status: All migrations are synchronized!');
      console.log('   Database is up to date with codebase.');
    } else if (pending.length > 0) {
      console.log('\n⚠️  Status: Migrations need to be applied!');
      console.log('   Run: npm run migrate');
    } else {
      console.log('\n⚠️  Status: Database has extra migrations!');
      console.log('   Review the extra migrations listed above.');
    }
    
    console.log('\n' + '═'.repeat(70) + '\n');
    
    // Exit with appropriate code
    if (pending.length > 0) {
      process.exit(1); // Exit with error if migrations are pending
    } else {
      process.exit(0); // Exit successfully
    }
    
  } catch (error) {
    console.error('\n❌ Error verifying migrations:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the verification
verifyMigrations();
