import FormData from "form-data";
import Mailgun from "mailgun.js";
import { config } from "dotenv";

// Load environment variables
config();

async function testMailgun() {
  console.log("\n🧪 Testing Mailgun Configuration...\n");
  
  // Check environment variables
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const testEmail = process.env.TEST_EMAIL || "james@smartclick.systems";
  
  if (!apiKey) {
    console.error("❌ MAILGUN_API_KEY not set in environment variables");
    process.exit(1);
  }
  
  if (!domain) {
    console.error("❌ MAILGUN_DOMAIN not set in environment variables");
    process.exit(1);
  }
  
  console.log(`✓ API Key: ${apiKey.substring(0, 15)}...`);
  console.log(`✓ Domain: ${domain}`);
  console.log(`✓ Test Email: ${testEmail}\n`);
  
  // Initialize Mailgun
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: apiKey,
  });
  
  try {
    console.log("📤 Sending test email...\n");
    
    const data = await mg.messages.create(domain, {
      from: `Secure2Send <noreply@${domain}>`,
      to: [testEmail],
      subject: "Mailgun Test - Secure2Send Integration",
      text: "Congratulations! Your Mailgun integration is working correctly with Secure2Send.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">🎉 Success!</h1>
          <p>Your Mailgun integration is working correctly with <strong>Secure2Send</strong>.</p>
          <p>This test email was sent from:</p>
          <ul>
            <li><strong>Domain:</strong> ${domain}</li>
            <li><strong>Application:</strong> Secure2Send Enterprise</li>
          </ul>
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            If you received this email, your Mailgun setup is complete and ready for production use.
          </p>
        </div>
      `,
    });

    console.log("✅ Email sent successfully!\n");
    console.log("📊 Response Data:");
    console.log(`   - Message ID: ${data.id}`);
    console.log(`   - Status: ${data.status || "Queued"}`);
    console.log(`   - Message: ${data.message}\n`);
    console.log("💡 Check your email inbox (and spam folder) for the test message.");
    console.log("💡 Also check Mailgun dashboard: Sending → Logs\n");
    
  } catch (error: any) {
    console.error("❌ Failed to send test email:\n");
    
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    
    if (error.message) {
      console.error(`   Message: ${error.message}`);
    }
    
    if (error.details) {
      console.error(`   Details: ${error.details}`);
    }
    
    console.error("\n💡 Common issues:");
    console.error("   - Check if recipient is authorized in Mailgun dashboard (Sandbox requirement)");
    console.error("   - Verify API key is correct (starts with 'key-')");
    console.error("   - Ensure domain matches exactly (no typos)");
    console.error("   - Check if you're using the correct region (US vs EU)\n");
    
    process.exit(1);
  }
}

// Run the test
testMailgun();

