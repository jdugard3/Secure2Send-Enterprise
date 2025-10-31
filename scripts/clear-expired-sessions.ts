/**
 * Clear Expired Sessions Script
 * 
 * This script clears all expired sessions from the database
 */

import { pool } from '../server/db';

async function clearExpiredSessions() {
  try {
    console.log('🔍 Checking for expired sessions...\n');
    
    // Count expired sessions
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM sessions WHERE expire < NOW()`
    );
    
    const expiredCount = parseInt(countResult.rows[0].count);
    
    if (expiredCount === 0) {
      console.log('✅ No expired sessions found!\n');
      return;
    }
    
    console.log(`Found ${expiredCount} expired session(s)\n`);
    console.log('🧹 Clearing expired sessions...');
    
    // Delete expired sessions
    await pool.query(`DELETE FROM sessions WHERE expire < NOW()`);
    
    console.log(`✅ Cleared ${expiredCount} expired session(s)\n`);
    
    // Show remaining sessions
    const remainingResult = await pool.query(
      `SELECT COUNT(*) as count FROM sessions WHERE expire >= NOW()`
    );
    
    const remainingCount = parseInt(remainingResult.rows[0].count);
    console.log(`📊 Active sessions remaining: ${remainingCount}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

clearExpiredSessions();

