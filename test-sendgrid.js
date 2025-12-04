// SendGrid Email Test Script
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

async function testSendGrid() {
  console.log('🧪 Testing SendGrid Email Service\n');
  console.log('='.repeat(60));

  // Get SendGrid API key from environment
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const FROM_EMAIL = process.env.SMTP_USER || 'interviewvault.2026@gmail.com';
  const TO_EMAIL = 'dheeraj8428@gmail.com';

  if (!SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY not found in .env file\n');
    console.error('📝 Setup Instructions:');
    console.error('   1. Sign up at: https://signup.sendgrid.com/');
    console.error('   2. Go to: Settings → API Keys');
    console.error('   3. Create a new API key with "Mail Send" permissions');
    console.error('   4. Add to .env file:');
    console.error('      SENDGRID_API_KEY=SG.your_key_here');
    console.error('\n   5. Verify sender email at: Settings → Sender Authentication');
    console.error(`      Verify: ${FROM_EMAIL}`);
    console.error('\n💡 SendGrid free tier: 100 emails/day');
    process.exit(1);
  }

  console.log(`📧 From: ${FROM_EMAIL}`);
  console.log(`📧 To: ${TO_EMAIL}`);
  console.log(`🔑 API Key: ${SENDGRID_API_KEY.substring(0, 10)}...`);
  console.log('='.repeat(60) + '\n');

  // Set API key
  sgMail.setApiKey(SENDGRID_API_KEY);

  // Email configuration
  const msg = {
    to: TO_EMAIL,
    from: FROM_EMAIL, // Must be verified in SendGrid
    subject: '✅ SendGrid Test - Interview Vault',
    text: 'This is a test email from Interview Vault using SendGrid API.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #4CAF50; margin-top: 0;">🎉 SendGrid Test Successful!</h2>

          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            This is a test email from your <strong>Interview Vault</strong> application using SendGrid API.
          </p>

          <div style="background-color: #f0f0f0; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Service:</strong> SendGrid API</p>
            <p style="margin: 5px 0;"><strong>From:</strong> ${FROM_EMAIL}</p>
            <p style="margin: 5px 0;"><strong>To:</strong> ${TO_EMAIL}</p>
            <p style="margin: 5px 0;"><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ✅ Delivered via HTTPS API</p>
          </div>

          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0; font-size: 16px;">✨ Why SendGrid Works on Render:</h3>
            <ul style="color: #333; line-height: 1.8; margin: 10px 0;">
              <li>Uses HTTPS API (not SMTP ports)</li>
              <li>No firewall restrictions</li>
              <li>Faster and more reliable</li>
              <li>Free tier: 100 emails/day</li>
              <li>Built-in analytics and tracking</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you received this email, your SendGrid integration is working perfectly! 🚀
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Interview Vault - Powered by SendGrid<br>
            Render Deployment Test
          </p>
        </div>
      </div>
    `
  };

  console.log('📤 Sending test email via SendGrid API...\n');
  const startTime = Date.now();

  try {
    const response = await sgMail.send(msg);
    const duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('✅ EMAIL SENT SUCCESSFULLY! 🎉');
    console.log('='.repeat(60));
    console.log(`⏱️  Time taken: ${duration}ms`);
    console.log(`📊 Status Code: ${response[0].statusCode}`);
    console.log(`📬 Message ID: ${response[0].headers['x-message-id']}`);
    console.log(`📧 Check inbox: ${TO_EMAIL}`);
    console.log('='.repeat(60));
    console.log('\n💡 SendGrid Advantages:');
    console.log('   ✅ Works on Render (no SMTP port blocking)');
    console.log('   ✅ Fast delivery via HTTPS API');
    console.log('   ✅ Free tier: 100 emails/day');
    console.log('   ✅ Email analytics and tracking');
    console.log('   ✅ Better deliverability than SMTP');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('\n' + '='.repeat(60));
    console.error('❌ EMAIL SENDING FAILED');
    console.error('='.repeat(60));
    console.error(`⏱️  Time taken: ${duration}ms`);
    console.error(`📛 Error: ${error.message}\n`);

    if (error.response) {
      console.error('📋 Response Details:');
      console.error(`   Status: ${error.response.statusCode}`);
      console.error(`   Body: ${JSON.stringify(error.response.body, null, 2)}`);
    }

    // Common errors and solutions
    if (error.code === 403 || (error.response && error.response.statusCode === 403)) {
      console.error('\n🔑 Authentication Error (403 Forbidden):');
      console.error('   → Invalid SendGrid API key');
      console.error('   → Check: Settings → API Keys in SendGrid dashboard');
      console.error('   → Ensure key has "Mail Send" permissions');
    } else if (error.message.includes('Sender email') || (error.response && error.response.body && error.response.body.errors)) {
      console.error('\n📧 Sender Verification Error:');
      console.error(`   → Email "${FROM_EMAIL}" not verified in SendGrid`);
      console.error('   → Go to: Settings → Sender Authentication');
      console.error('   → Option 1: Single Sender Verification (quick)');
      console.error('   → Option 2: Domain Authentication (recommended)');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('\n🌐 Network Error:');
      console.error('   → Cannot reach SendGrid API');
      console.error('   → Check internet connection');
      console.error('   → Firewall may be blocking HTTPS requests');
    }

    console.error('\n' + '='.repeat(60));
    console.error('\n📝 Quick Setup Guide:');
    console.error('   1. npm install @sendgrid/mail');
    console.error('   2. Create account: https://signup.sendgrid.com/');
    console.error('   3. Get API key: Settings → API Keys');
    console.error('   4. Verify sender: Settings → Sender Authentication');
    console.error('   5. Add to .env: SENDGRID_API_KEY=SG.your_key_here');
    console.error('='.repeat(60) + '\n');

    process.exit(1);
  }
}

// Run the test
testSendGrid();
