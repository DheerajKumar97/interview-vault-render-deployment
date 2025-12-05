# Alternative: Free External Cron Service (No Render Cron Job Needed)

## Why Use External Cron Service?

**Benefits:**
- ✅ Completely FREE - no Render cron job hours consumed
- ✅ More reliable than Render free tier
- ✅ No additional Render service needed
- ✅ Works with any hosting provider

**Trade-offs:**
- ⚠️ Depends on third-party service
- ⚠️ Slightly less secure (exposes public endpoint)
- ⚠️ May have rate limits

## Setup Instructions

### Step 1: Create Public Digest Trigger Endpoint

Add this to your `server.js`:

```javascript
// Public endpoint for external cron services to trigger digest check
app.get('/api/cron/check-digests', async (req, res) => {
  // Security: Check for secret token
  const cronSecret = process.env.CRON_SECRET || 'your-secret-token-here';
  const providedSecret = req.query.secret || req.headers['x-cron-secret'];

  if (providedSecret !== cronSecret) {
    console.log('❌ Unauthorized cron attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('⏰ External cron triggered digest check...');

  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;

    console.log(`   Checking for digests scheduled at: ${currentTimeString}`);

    // Fetch active digest preferences
    const { data: preferences, error: prefError } = await supabase
      .from('email_digest_preferences')
      .select('*')
      .eq('is_active', true);

    if (prefError) {
      throw prefError;
    }

    // Filter for digests due now (within 15-minute window)
    const duePreferences = preferences?.filter(pref => {
      const prefTime = pref.scheduled_time;
      if (!prefTime) return false;

      const [prefHourStr, prefMinuteStr] = prefTime.split(':');
      const prefHour = parseInt(prefHourStr);
      const prefMinute = parseInt(prefMinuteStr);

      // Match if within 15-minute window
      const minuteDiff = Math.abs((currentHour * 60 + currentMinute) - (prefHour * 60 + prefMinute));
      return minuteDiff <= 15;
    }) || [];

    console.log(`   Found ${duePreferences.length} digests to send`);

    // Send digests
    let sentCount = 0;
    for (const pref of duePreferences) {
      const { data: userData } = await supabase.auth.admin.getUserById(pref.user_id);
      if (!userData?.user?.email) continue;

      const { count: totalApps } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', pref.user_id);

      await sendDigestEmailInternal(userData.user.email, pref.frequency, totalApps || 0, pref.user_id);
      sentCount++;
    }

    res.json({
      success: true,
      checked_at: currentTimeString,
      digests_sent: sentCount,
      total_active: preferences?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in cron digest check:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Step 2: Add CRON_SECRET Environment Variable

In Render dashboard, add:
- **Key:** `CRON_SECRET`
- **Value:** Generate a random string (e.g., `crypto.randomBytes(32).toString('hex')`)

### Step 3: Choose External Cron Service

#### **Option A: cron-job.org** (Recommended)

1. Go to [cron-job.org](https://cron-job.org)
2. Create free account
3. Create new cron job:
   - **Title:** Interview Vault Email Digests
   - **URL:** `https://your-app.onrender.com/api/cron/check-digests?secret=YOUR_SECRET_TOKEN`
   - **Schedule:** Every 15 minutes
   - **Method:** GET
4. Save and enable

#### **Option B: EasyCron.com**

1. Go to [easycron.com](https://www.easycron.com)
2. Create free account (80 executions/day on free tier)
3. Create cron job:
   - **URL:** `https://your-app.onrender.com/api/cron/check-digests`
   - **Header:** `X-Cron-Secret: YOUR_SECRET_TOKEN`
   - **Schedule:** `*/15 * * * *`

#### **Option C: GitHub Actions** (100% Free)

Create `.github/workflows/send-digests.yml`:

```yaml
name: Send Email Digests

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-digests:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Digest Check
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/check-digests?secret=${{ secrets.CRON_SECRET }}"
```

Add secrets in GitHub repository settings:
- `APP_URL`: Your Render app URL
- `CRON_SECRET`: Your secret token

### Step 4: Remove Render Cron Job

Update `render.yaml` - remove the cron job service entirely:

```yaml
services:
  - type: web
    name: interview-compass
    env: node
    buildCommand: npm ci && node create-env.js && npm run build
    startCommand: npm start
    # ... rest of web service config

  # No cron job service needed!
```

### Step 5: Test

1. Manually trigger the endpoint:
   ```bash
   curl "https://your-app.onrender.com/api/cron/check-digests?secret=YOUR_SECRET"
   ```

2. Check server logs for:
   ```
   ⏰ External cron triggered digest check...
   Found X digests to send
   ```

## Comparison: Render Cron vs External Cron

| Feature | Render Cron Job | External Cron | GitHub Actions |
|---------|-----------------|---------------|----------------|
| **Cost** | Uses free tier hours | 100% Free | 100% Free |
| **Reliability** | Good | Excellent | Excellent |
| **Setup** | Easy | Medium | Medium |
| **Security** | Better (internal) | Good (with secret) | Good (with secret) |
| **Maintenance** | Low | Low | Very Low |
| **Vendor Lock-in** | Render-specific | Portable | Portable |

## Recommendation

**For Free Tier Users:**
- Use **GitHub Actions** if you're already using GitHub
- Use **cron-job.org** otherwise
- Remove Render cron job service entirely

**For Paid Tier Users:**
- Keep using Render cron job (simpler, more secure)

## Security Best Practices

1. **Always use CRON_SECRET** - never expose endpoint publicly
2. **Rotate secret regularly** - change every 3-6 months
3. **Monitor logs** - check for unauthorized access attempts
4. **Use HTTPS only** - never HTTP for cron endpoints
5. **Add rate limiting** - prevent abuse (optional)

## Troubleshooting

### External Cron Not Triggering
- Verify URL is correct and accessible
- Check secret token matches
- Review external service logs
- Ensure Render app is not sleeping (add health check endpoint)

### Digests Not Sending
- Check server logs when cron triggers
- Verify Supabase connection
- Check email API credentials
- Test endpoint manually with curl

## Future Improvements

1. **Add email queue** - prevent duplicate sends
2. **Add retry logic** - handle temporary failures
3. **Add monitoring** - alert when digests fail
4. **Add deduplication** - track last sent time
