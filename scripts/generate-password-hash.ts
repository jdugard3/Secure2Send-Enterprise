import { PasswordSecurityService } from '../server/services/passwordSecurity';

const password = process.argv[2] || 'MiaPayments123!';

console.log(`\n🔐 Generating hash for password: ${password}\n`);

PasswordSecurityService.hashPassword(password).then(hash => {
  console.log('Hashed password:');
  console.log(hash);
  console.log('\n📋 Run this SQL command in your SSH session:\n');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = 'admin@secure2send.com';`);
  console.log('\n');
});

