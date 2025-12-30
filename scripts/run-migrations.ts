/**
 * Run database migrations from SQL files
 * This script executes all migration files in the migrations directory
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { env } from '../server/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...\n');
    
    // Get all SQL migration files, sorted by name
    const migrationsDir = join(__dirname, '../migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort alphabetically to run in order
    
    console.log(`📋 Found ${sqlFiles.length} migration files\n`);
    
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Get already executed migrations
    const executedResult = await client.query('SELECT filename FROM _migrations');
    const executedMigrations = new Set(executedResult.rows.map(row => row.filename));
    
    let executedCount = 0;
    
    for (const file of sqlFiles) {
      if (executedMigrations.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }
      
      console.log(`📄 Running ${file}...`);
      
      try {
        const sql = await readFile(join(migrationsDir, file), 'utf-8');
        
        // Execute the migration
        await client.query('BEGIN');
        await client.query(sql);
        
        // Record that this migration was executed
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        
        await client.query('COMMIT');
        console.log(`✅ ${file} completed successfully\n`);
        executedCount++;
      } catch (error: any) {
        await client.query('ROLLBACK');
        
        // Check if error is due to "already exists" - these are safe to ignore
        const errorMessage = error?.message || '';
        const errorCode = error?.code || '';
        
        // PostgreSQL error codes for "already exists" scenarios
        const alreadyExistsCodes = [
          '42701', // duplicate_column
          '42P07', // duplicate_table
          '42710', // duplicate_object
          '42P16', // invalid_table_definition (sometimes used for duplicates)
        ];
        
        // Check if this is an "already exists" error
        const isAlreadyExists = 
          alreadyExistsCodes.includes(errorCode) ||
          errorMessage.toLowerCase().includes('already exists') ||
          errorMessage.toLowerCase().includes('duplicate');
        
        if (isAlreadyExists) {
          console.log(`⚠️  ${file} - Some objects already exist (likely already applied)`);
          console.log(`   Marking as executed to avoid re-running...\n`);
          
          // Mark as executed even though it "failed" - the objects already exist
          try {
            await client.query('BEGIN');
            await client.query(
              'INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
              [file]
            );
            await client.query('COMMIT');
            executedCount++;
          } catch (insertError) {
            await client.query('ROLLBACK');
            // If we can't insert, the migration was probably already tracked
            console.log(`   (Migration already tracked in database)\n`);
          }
        } else {
          // Real error - throw it
          console.error(`❌ Error running ${file}:`, error);
          throw error;
        }
      }
    }
    
    if (executedCount === 0) {
      console.log('✨ All migrations are up to date!');
    } else {
      console.log(`\n✨ Successfully executed ${executedCount} migration(s)!`);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();

