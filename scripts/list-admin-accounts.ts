/**
 * List Admin Accounts Script
 * 
 * This script lists all admin accounts in the database
 */

import { pool } from '../server/db';

async function listAdminAccounts() {
  try {
    console.log('🔍 Looking for admin accounts...\n');
    
    // Find all admin users
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, company_name, email_verified, 
              mfa_enabled, mfa_email_enabled, mfa_required, created_at 
       FROM users WHERE role = 'ADMIN' ORDER BY created_at DESC`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No admin accounts found!\n');
      return;
    }
    
    console.log(`✅ Found ${result.rows.length} admin account(s):\n`);
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.first_name || 'N/A'} ${user.last_name || 'N/A'}`);
      console.log(`   Company: ${user.company_name || 'N/A'}`);
      console.log(`   Email Verified: ${user.email_verified ? '✅' : '❌'}`);
      console.log(`   MFA TOTP: ${user.mfa_enabled ? '✅' : '❌'}`);
      console.log(`   MFA Email: ${user.mfa_email_enabled ? '✅' : '❌'}`);
      console.log(`   MFA Required: ${user.mfa_required ? '✅' : '❌'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log('');
    });
    
    console.log('💡 To reset an admin password, run:');
    console.log('   npx tsx scripts/check-user-account.ts <email> <new-password>\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

listAdminAccounts();



