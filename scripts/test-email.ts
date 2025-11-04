import { config } from 'dotenv';
config();

// Import after loading env
import { EmailService } from '../server/services/emailService';

async function testEmail() {
  console.log('\n🧪 Testing Mailgun Email Configuration...\n');
  
  // Get test email from command line or use default
  const testEmail = process.argv[2] || 'your-email@example.com';
  
  if (testEmail === 'your-email@example.com') {
    console.log('❌ Please provide a test email address!');
    console.log('Usage: npm run test:email your-email@example.com\n');
    process.exit(1);
  }
  
  console.log(`📧 Sending test email to: ${testEmail}`);
  console.log(`📤 Using provider: ${process.env.EMAIL_PROVIDER}`);
  console.log(`🌐 Domain: ${process.env.MAILGUN_DOMAIN}`);
  console.log(`📨 From: ${process.env.MAILGUN_FROM_EMAIL}\n`);
  
  try {
    // Send a test welcome email
    await EmailService.sendWelcomeEmail({
      id: 'test-user-id',
      email: testEmail,
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company',
      password: 'hashed-password',
      role: 'CLIENT',
      createdAt: new Date().toISOString(),
      mfaEnabled: false,
      mfaSecret: null,
      mfaMethod: null,
      mfaBackupCodes: null,
      mfaRequired: false,
      agreementAcceptedAt: null,
    } as any);
    
    console.log('✅ Test email sent successfully!');
    console.log('📬 Check your inbox (and spam folder) for the welcome email.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error(error);
    console.log('\n💡 Troubleshooting tips:');
    console.log('  1. Make sure MAILGUN_API_KEY is set correctly');
    console.log('  2. Verify MAILGUN_DOMAIN matches your verified domain in Mailgun');
    console.log('  3. Check that EMAIL_PROVIDER is set to "mailgun"');
    console.log('  4. Ensure your Mailgun domain is verified (green checkmark)\n');
    process.exit(1);
  }
}

testEmail();

