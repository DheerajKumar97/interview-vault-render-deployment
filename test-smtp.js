// Simple SMTP Email Test
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testSMTP() {
  console.log('🧪 Testing SMTP Email Configuration\n');
  console.log('='.repeat(60));

  // Get credentials from .env
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = "xtbdonnywkyoggyq"//process.env.SMTP_PASS;

  if (!SMTP_USER || !SMTP_PASS) {
    console.error('❌ Missing SMTP credentials in .env file');
    console.error('   Required: SMTP_USER, SMTP_PASS');
    process.exit(1);
  }

  // Remove spaces from password (common issue with Gmail App Passwords)
  const cleanPassword = SMTP_PASS.replace(/\s/g, '');

  console.log(`📧 SMTP User: ${SMTP_USER}`);
  console.log(`🔑 Password length: ${cleanPassword.length} characters`);
  console.log(`🔑 Has spaces: ${SMTP_PASS.includes(' ') ? 'YES ⚠️ (removing them)' : 'NO ✅'}`);
  console.log('='.repeat(60) + '\n');

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: cleanPassword
    },
    pool: false, // Don't use connection pooling for test
    connectionTimeout: 10000, // 10 second timeout
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  // Test email configuration
  const mailOptions = {
    from: SMTP_USER,
    to: SMTP_USER, // Send to yourself for testing
    subject: '✅ SMTP Test Email - Interview Vault',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #4CAF50; margin-top: 0;">🎉 SMTP Configuration Test Successful!</h2>
          <p style="font-size: 16px; color: #333;">
            This is a test email from your <strong>Interview Vault</strong> application.
          </p>
          <div style="background-color: #f0f0f0; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>From:</strong> ${SMTP_USER}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ✅ Email delivery working correctly</p>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you received this email, your SMTP configuration is working properly!
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            Interview Vault - Render Deployment Test
          </p>
        </div>
      </div>
    `
  };

  console.log('📤 Attempting to send test email...\n');
  console.log(`   From: ${mailOptions.from}`);
  console.log(`   To: ${mailOptions.to}`);
  console.log(`   Subject: ${mailOptions.subject}\n`);

  const startTime = Date.now();

  try {
    // Verify connection first
    console.log('🔌 Step 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');

    // Send email
    console.log('📨 Step 2: Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('✅ EMAIL SENT SUCCESSFULLY! 🎉');
    console.log('='.repeat(60));
    console.log(`⏱️  Time taken: ${duration}ms`);
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`📧 Check your inbox: ${SMTP_USER}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('\n' + '='.repeat(60));
    console.error('❌ EMAIL SENDING FAILED');
    console.error('='.repeat(60));
    console.error(`⏱️  Time taken: ${duration}ms`);
    console.error(`📛 Error: ${error.message}\n`);

    if (error.code === 'EAUTH') {
      console.error('🔑 Authentication Error - Possible causes:');
      console.error('   1. Incorrect Gmail App Password');
      console.error('   2. 2-Step Verification not enabled on Gmail account');
      console.error('   3. Using regular password instead of App Password\n');
      console.error('📝 To fix:');
      console.error('   1. Go to: https://myaccount.google.com/apppasswords');
      console.error('   2. Generate a NEW App Password for "Mail"');
      console.error('   3. Copy the 16-character password (no spaces)');
      console.error('   4. Update SMTP_PASS in your .env file');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('⏰ Connection Timeout - Possible causes:');
      console.error('   1. Firewall blocking outbound SMTP (port 587/465)');
      console.error('   2. Network issues');
      console.error('   3. Gmail temporarily blocking connection');
    } else if (error.code === 'ECONNECTION') {
      console.error('🔌 Connection Error - Possible causes:');
      console.error('   1. No internet connection');
      console.error('   2. Gmail SMTP servers unreachable');
      console.error('   3. Firewall blocking SMTP ports');
    }

    console.error('\n' + '='.repeat(60) + '\n');
    process.exit(1);
  }
}

// Run the test
testSMTP();
