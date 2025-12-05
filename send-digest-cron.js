// Render Cron Job Script - Sends Scheduled Email Digests
// This script should be run as a separate Render Cron Job service

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendScheduledDigests() {
  console.log('⏰ Starting scheduled digest check...');
  console.log(`   Current time: ${new Date().toISOString()}`);

  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Format current time as HH:MM:00
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;
    console.log(`   Checking for digests scheduled at: ${currentTimeString}`);

    // 1. Fetch all active digest preferences
    const { data: preferences, error: prefError } = await supabase
      .from('email_digest_preferences')
      .select('*')
      .eq('is_active', true);

    if (prefError) {
      console.error('❌ Error fetching preferences:', prefError);
      return;
    }

    console.log(`   Found ${preferences?.length || 0} active preferences.`);

    if (!preferences || preferences.length === 0) {
      console.log('   No active digest preferences found.');
      return;
    }

    // 2. Filter for those scheduled NOW
    const duePreferences = preferences.filter(pref => {
      const prefTime = pref.scheduled_time;
      if (!prefTime) return false;

      // Handle potential time formats (HH:MM:00 or HH:MM)
      const [prefHourStr, prefMinuteStr] = prefTime.split(':');
      const prefHour = parseInt(prefHourStr);
      const prefMinute = parseInt(prefMinuteStr);

      const isMatch = prefHour === currentHour && prefMinute === currentMinute;

      if (isMatch) {
        console.log(`   ✅ Match found: ${prefTime} for user ${pref.user_id}`);
      }

      return isMatch;
    });

    if (duePreferences.length === 0) {
      console.log(`   No digests due at ${currentTimeString}`);
      return;
    }

    console.log(`   📧 Found ${duePreferences.length} digests to send.`);

    // 3. Send each digest by calling the API endpoint
    const API_URL = process.env.RENDER_EXTERNAL_URL || process.env.VITE_API_URL || 'http://localhost:3000';

    for (const pref of duePreferences) {
      try {
        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(pref.user_id);

        if (userError || !userData?.user?.email) {
          console.error(`   ❌ Could not find email for user ${pref.user_id}`);
          continue;
        }

        const email = userData.user.email;
        console.log(`   🚀 Sending digest to ${email} (${pref.frequency})...`);

        // Call the digest API endpoint
        const response = await axios.post(`${API_URL}/api/send-digest-email`, {
          email: email,
          frequency: pref.frequency,
          userId: pref.user_id
        }, {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          console.log(`   ✅ Digest sent successfully to ${email}`);
        } else {
          console.log(`   ⚠️  Unexpected response: ${response.status}`);
        }

      } catch (error) {
        console.error(`   ❌ Error sending digest:`, error.message);
      }
    }

    console.log('✅ Scheduled digest check completed.');

  } catch (error) {
    console.error('❌ Fatal error in sendScheduledDigests:', error);
    process.exit(1);
  }
}

// Run the function
sendScheduledDigests()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
