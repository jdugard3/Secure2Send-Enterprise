/**
 * Check User Account Script
 * 
 * This script helps you check your user account details and optionally reset password
 */

import { pool } from '../server/db';
import { hashPassword } from '../server/auth';

async function checkUserAccount() {
  try {
    const email = process.argv[2];
    const newPassword = process.argv[3];
    
    if (!email) {
      console.log('❌ Please provide an email address\n');
      console.log('Usage:');
      console.log('  Check account: npx tsx scripts/check-user-account.ts <email>');
      console.log('  Reset password: npx tsx scripts/check-user-account.ts <email> <new-password>\n');
      console.log('Example:');
      console.log('  npx tsx scripts/check-user-account.ts user@example.com');
      console.log('  npx tsx scripts/check-user-account.ts user@example.com NewPassword123\n');
      return;
    }
    
    // Check if user exists
    const userResult = await pool.query(
      `SELECT id, email, first_name, last_name, company_name, role, email_verified, 
              mfa_enabled, mfa_email_enabled, mfa_required, created_at 
       FROM users WHERE email = $1`,
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User with email "${email}" not found!\n`);
      return;
    }
    
    const user = userResult.rows[0];
    
    console.log('\n✅ User Account Found:\n');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name || 'N/A'} ${user.last_name || 'N/A'}`);
    console.log(`   Company: ${user.company_name || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Email Verified: ${user.email_verified ? '✅' : '❌'}`);
    console.log(`   MFA TOTP Enabled: ${user.mfa_enabled ? '✅' : '❌'}`);
    console.log(`   MFA Email Enabled: ${user.mfa_email_enabled ? '✅' : '❌'}`);
    console.log(`   MFA Required: ${user.mfa_required ? '✅' : '❌'}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}\n`);
    
    // Check for associated client record (if CLIENT role)
    if (user.role === 'CLIENT') {
      const clientResult = await pool.query(
        `SELECT id, status, iris_lead_id FROM clients WHERE user_id = $1`,
        [user.id]
      );
      
      if (clientResult.rows.length > 0) {
        const client = clientResult.rows[0];
        console.log('📋 Client Profile:');
        console.log(`   Client ID: ${client.id}`);
        console.log(`   Status: ${client.status}`);
        console.log(`   IRIS Lead ID: ${client.iris_lead_id || 'N/A'}\n`);
      } else {
        console.log('⚠️  No client profile found (will be created on first document upload)\n');
      }
    }
    
    // Check sessions
    const sessionResult = await pool.query(
      `SELECT sid, expire FROM sessions WHERE sess::text LIKE '%${user.id}%'`
    );
    
    console.log(`🔐 Active Sessions: ${sessionResult.rows.length}`);
    if (sessionResult.rows.length > 0) {
      sessionResult.rows.forEach((session, index) => {
        const expired = new Date(session.expire) < new Date();
        console.log(`   ${index + 1}. Expires: ${new Date(session.expire).toLocaleString()} ${expired ? '(EXPIRED)' : ''}`);
      });
      console.log('');
    }
    
    // If new password provided, update it
    if (newPassword) {
      console.log('🔄 Updating password...\n');
      const hashedPassword = await hashPassword(newPassword);
      
      await pool.query(
        `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
        [hashedPassword, user.id]
      );
      
      console.log('✅ Password updated successfully!');
      console.log(`   New Password: ${newPassword}\n`);
      
      // Clear all sessions for this user
      console.log('🧹 Clearing all sessions for this user...');
      const deleteResult = await pool.query(
        `DELETE FROM sessions WHERE sess::text LIKE '%${user.id}%'`
      );
      console.log(`✅ Cleared ${deleteResult.rowCount} session(s)\n`);
      
      console.log('✨ You can now log in with the new password!\n');
    } else {
      console.log('💡 Tip: To reset password, run:');
      console.log(`   npx tsx scripts/check-user-account.ts ${email} NewPassword123\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUserAccount();

