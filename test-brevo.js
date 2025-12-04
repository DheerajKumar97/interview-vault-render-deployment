// Brevo (formerly Sendinblue) Email Test Script - Completely FREE (300 emails/day)
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testBrevo() {
  console.log('🧪 Testing Brevo Email Service\n');
  console.log('='.repeat(60));

  // Get Brevo API key from environment
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const FROM_EMAIL = process.env.SMTP_USER || 'interviewvault.2026@gmail.com';
  const FROM_NAME = 'Interview Vault';
  const TO_EMAIL = 'dheeraj8428@gmail.com';

  if (!BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY not found in .env file\n');
    console.error('📝 Setup Instructions (3 minutes):');
    console.error('   1. Sign up FREE: https://app.brevo.com/account/register');
    console.error('   2. Go to: Settings → SMTP & API → API Keys');
    console.error('   3. Click "Generate a new API key"');
    console.error('   4. Name it: "Interview Vault"');
    console.error('   5. Copy the API key (starts with "xkeysib-")');
    console.error('   6. Add to .env file:');
    console.error('      BREVO_API_KEY=xkeysib-your_key_here');
    console.error('\n💡 Brevo FREE tier:');
    console.error('   ✅ 300 emails/day (3x more than Resend!)');
    console.error('   ✅ No credit card required');
    console.error('   ✅ No domain verification needed for testing');
    console.error('   ✅ Send to ANY email address immediately');
    console.error('   ✅ Works on Render (HTTPS API, no SMTP ports)');
    process.exit(1);
  }

  console.log(`📧 From: ${FROM_NAME} <${FROM_EMAIL}>`);
  console.log(`📧 To: ${TO_EMAIL}`);
  console.log(`🔑 API Key: ${BREVO_API_KEY.substring(0, 12)}...`);
  console.log('='.repeat(60) + '\n');

  // Email configuration
  const emailData = {
    sender: {
      name: FROM_NAME,
      email: FROM_EMAIL
    },
    to: [
      {
        email: TO_EMAIL,
        name: 'Dheeraj Kumar'
      }
    ],
    subject: '✅ Brevo Test - Interview Vault',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #4CAF50; margin-top: 0;">🎉 Brevo Test Successful!</h2>

          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            This is a test email from your <strong>Interview Vault</strong> application using Brevo API.
          </p>

          <div style="background-color: #f0f0f0; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Service:</strong> Brevo API</p>
            <p style="margin: 5px 0;"><strong>From:</strong> ${FROM_EMAIL}</p>
            <p style="margin: 5px 0;"><strong>To:</strong> ${TO_EMAIL}</p>
            <p style="margin: 5px 0;"><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ✅ Delivered via HTTPS API</p>
          </div>

          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2e7d32; margin-top: 0; font-size: 16px;">✨ Why Brevo is Perfect:</h3>
            <ul style="color: #333; line-height: 1.8; margin: 10px 0;">
              <li><strong>Most Generous Free Tier:</strong> 300 emails/day (3x Resend!)</li>
              <li><strong>No Credit Card:</strong> Completely free, no payment info needed</li>
              <li><strong>Works on Render:</strong> HTTPS API (no SMTP blocking)</li>
              <li><strong>Send to Anyone:</strong> No verification needed for testing</li>
              <li><strong>Lightning Fast:</strong> &lt;1 second delivery</li>
              <li><strong>SMS Too:</strong> Can send SMS in addition to emails</li>
              <li><strong>Marketing Tools:</strong> Email campaigns, automation included</li>
            </ul>
          </div>

          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #e65100; margin-top: 0; font-size: 16px;">📊 Free Tier Comparison:</h3>
            <table style="width: 100%; border-collapse: collapse; color: #333;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Service</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Free Emails/Day</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Verification</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">Brevo</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #2e7d32;"><strong>300</strong> ✅</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">Optional</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">Resend</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">100</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">Required</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">SendGrid</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">100</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">Required</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you received this email, your Brevo integration is working perfectly! 🚀
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Interview Vault - Powered by Brevo<br>
            300 Emails/Day • 100% Free • No Credit Card Required
          </p>
        </div>
      </div>
    `
  };

  console.log('📤 Sending test email via Brevo API...\n');
  const startTime = Date.now();

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      emailData,
      {
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json'
        },
        timeout: 15000
      }
    );

    const duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('✅ EMAIL SENT SUCCESSFULLY! 🎉');
    console.log('='.repeat(60));
    console.log(`⏱️  Time taken: ${duration}ms`);
    console.log(`📬 Message ID: ${response.data.messageId}`);
    console.log(`📧 Check inbox: ${TO_EMAIL}`);
    console.log('='.repeat(60));
    console.log('\n💡 Brevo Advantages:');
    console.log('   ✅ 300 emails/day FREE (most generous!)');
    console.log('   ✅ No credit card required');
    console.log('   ✅ Works on Render (no SMTP blocking)');
    console.log('   ✅ Send to ANY email (no verification needed)');
    console.log('   ✅ Fast delivery via HTTPS API');
    console.log('   ✅ Bonus: SMS capability included');
    console.log('   ✅ Marketing automation tools included');
    console.log('='.repeat(60));
    console.log('\n🎯 Next Steps:');
    console.log('   1. Add BREVO_API_KEY to Render environment variables');
    console.log('   2. Update your email service to use Brevo API');
    console.log('   3. Enjoy 300 emails/day for free!');
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
      console.error(`   Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);

      if (error.response.status === 401) {
        console.error('\n🔑 Authentication Error (401 Unauthorized):');
        console.error('   → Invalid Brevo API key');
        console.error('   → Check: Settings → SMTP & API → API Keys');
        console.error('   → Key should start with "xkeysib-"');
      } else if (error.response.status === 400) {
        console.error('\n📧 Bad Request (400):');
        console.error('   → Check email format');
        console.error('   → Ensure sender email is valid');
        if (error.response.data && error.response.data.message) {
          console.error(`   → ${error.response.data.message}`);
        }
      } else if (error.response.status === 402) {
        console.error('\n💳 Account Limit Reached (402):');
        console.error('   → You\'ve sent 300 emails today (free limit)');
        console.error('   → Wait until tomorrow or upgrade plan');
      }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('\n🌐 Network Error:');
      console.error('   → Cannot reach Brevo API');
      console.error('   → Check internet connection');
      console.error('   → Firewall may be blocking HTTPS requests');
    }

    console.error('\n' + '='.repeat(60));
    console.error('\n📝 Quick Setup Guide:');
    console.error('   1. Sign up FREE: https://app.brevo.com/account/register');
    console.error('   2. Settings → SMTP & API → API Keys');
    console.error('   3. Generate new API key');
    console.error('   4. Add to .env: BREVO_API_KEY=xkeysib-your_key_here');
    console.error('   5. Run: node test-resend.js');
    console.error('\n💡 Note: File is named test-resend.js but now uses Brevo!');
    console.error('='.repeat(60) + '\n');

    process.exit(1);
  }
}

// Run the test
testBrevo();
