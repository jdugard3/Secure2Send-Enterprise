import pg from 'pg';
const { Pool } = pg;

async function listAdminUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, role, created_at 
      FROM users 
      WHERE role = 'ADMIN' 
      ORDER BY created_at
    `);

    console.log('\n📋 Admin Accounts:\n');
    console.log('════════════════════════════════════════════════════════════');
    
    result.rows.forEach((user, i) => {
      console.log(`\n${i + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    });
    
    console.log('\n════════════════════════════════════════════════════════════');
    console.log(`\nTotal Admin Accounts: ${result.rows.length}\n`);
  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

listAdminUsers();

