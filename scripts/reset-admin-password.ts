import { config } from 'dotenv';
config();

import pg from 'pg';
import { hashPassword } from '../server/services/passwordSecurity';
const { Pool } = pg;

async function resetAdminPassword() {
  // Get new password from command line or generate one
  const newPassword = process.argv[2];
  
  if (!newPassword) {
    console.log('\n❌ Please provide a new password!');
    console.log('Usage: npm run reset:admin:password YOUR_NEW_PASSWORD\n');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.log('\n❌ Password must be at least 8 characters long!\n');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('\n🔄 Resetting password for admin@secure2send.com...\n');

    // Check if user exists
    const checkUser = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE email = $1',
      ['admin@secure2send.com']
    );

    if (checkUser.rows.length === 0) {
      console.log('❌ User admin@secure2send.com not found in database!\n');
      process.exit(1);
    }

    const user = checkUser.rows[0];
    console.log(`✅ Found user: ${user.first_name} ${user.last_name} (${user.email})`);

    // Hash the new password
    console.log('🔐 Hashing new password...');
    const hashedPassword = await hashPassword(newPassword);

    // Update the password
    await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, 'admin@secure2send.com']
    );

    console.log('\n✅ Password successfully reset for admin@secure2send.com!');
    console.log('\n📝 Login credentials:');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`   Email:    admin@secure2send.com`);
    console.log(`   Password: ${newPassword}`);
    console.log('════════════════════════════════════════════════════════════');
    console.log('\n🌐 Login at: https://secure2send.com/login\n');

  } catch (error) {
    console.error('\n❌ Error resetting password:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();

