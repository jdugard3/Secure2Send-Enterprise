/**
 * Test Zapier Webhook with Auth Token
 * This sends a test payload to Zapier so you can see the _auth field
 */

// Generate a random token for testing (or use your actual one from .env)
const testToken = 'test-token-' + Math.random().toString(36).substring(7);

const testPayload = {
  applicationId: 'test-123',
  status: 'APPROVED',
  approvedAt: new Date().toISOString(),
  merchant: {
    legalBusinessName: 'Test Company LLC',
    dbaBusinessName: 'Test Store',
    contactEmail: 'test@example.com',
  },
  documents: [
    {
      id: 1,
      originalName: 'test-document.pdf',
      documentType: 'SS4_EIN_LETTER',
      downloadUrl: 'https://example.com/test.pdf',
    }
  ],
  // THIS IS THE IMPORTANT PART - The auth fields (flattened for Zapier)
  auth_token: testToken,
  auth_timestamp: new Date().toISOString(),
  _metadata: {
    note: 'This is a test webhook to populate Zapier fields',
  }
};

// Your webhook URL
const WEBHOOK_URL = process.argv[2] || 'https://hooks.zapier.com/hooks/catch/24656561/u8ijsc1/';

console.log('🧪 Sending test webhook to Zapier...\n');
console.log('📍 Webhook URL:', WEBHOOK_URL);
console.log('🔑 Test Token:', testToken);
console.log('\n📦 Payload:');
console.log(JSON.stringify(testPayload, null, 2));

fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testPayload),
})
  .then(response => response.json())
  .then(data => {
    console.log('\n✅ Webhook sent successfully!');
    console.log('📥 Zapier Response:', data);
    console.log('\n📋 Next Steps:');
    console.log('1. Go to your Zap: https://zapier.com/app/zaps');
    console.log('2. Click "Edit" on your KindTap Zap');
    console.log('3. Click on the Webhook trigger step');
    console.log('4. You should now see the test data in the "Test trigger" section');
    console.log('5. Look for "auth_token" in the available fields (NOT nested in _auth)');
    console.log('6. Add a Filter step after the webhook');
    console.log('7. Set: auth_token | Text Exactly Matches | ' + testToken);
    console.log('\n💡 Remember to use your REAL token from .env in production!');
  })
  .catch(error => {
    console.error('\n❌ Error sending webhook:', error.message);
    console.log('\n💡 Make sure the webhook URL is correct and accessible');
  });

