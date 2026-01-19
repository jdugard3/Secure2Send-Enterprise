/**
 * Script to fix timezone issues in the database
 * This will check the current database timezone and optionally convert existing timestamps
 */

import { pool } from '../server/db';

async function fixTimezones() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database timezone settings...\n');
    
    // Check current timezone
    const timezoneResult = await client.query('SHOW timezone');
    console.log(`Current database timezone: ${timezoneResult.rows[0].TimeZone}`);
    
    // Set timezone to UTC for this session
    await client.query('SET timezone = "UTC"');
    console.log('✅ Set session timezone to UTC\n');
    
    // Check for documents with timestamps
    const documentCount = await client.query(
      'SELECT COUNT(*) as count FROM documents WHERE uploaded_at IS NOT NULL'
    );
    console.log(`📄 Found ${documentCount.rows[0].count} documents with upload timestamps`);
    
    // Sample some recent timestamps to show the issue
    const sampleDocs = await client.query(`
      SELECT 
        id, 
        original_name,
        uploaded_at,
        uploaded_at AT TIME ZONE 'UTC' as uploaded_at_utc
      FROM documents 
      WHERE uploaded_at IS NOT NULL 
      ORDER BY uploaded_at DESC 
      LIMIT 5
    `);
    
    if (sampleDocs.rows.length > 0) {
      console.log('\n📊 Sample document timestamps:');
      sampleDocs.rows.forEach((doc, i) => {
        console.log(`\n${i + 1}. ${doc.original_name}`);
        console.log(`   Original: ${doc.uploaded_at}`);
        console.log(`   UTC:      ${doc.uploaded_at_utc}`);
      });
    }
    
    console.log('\n✅ Timezone check complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart your server to apply UTC timezone settings');
    console.log('   2. New uploads will use UTC timestamps automatically');
    console.log('   3. Old timestamps will be correctly interpreted as UTC');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixTimezones().catch(console.error);
