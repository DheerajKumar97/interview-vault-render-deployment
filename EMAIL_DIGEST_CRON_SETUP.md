# Email Digest Cron Job Setup for Render

## Problem
The in-process cron jobs in `server.js` don't work reliably on Render because:
- **Free Tier**: Web services spin down after 15 minutes of inactivity
- **When sleeping**: Node-cron jobs stop running
- **Restarts**: Any server restart kills the cron jobs

## Solution: Render Cron Jobs

Use Render's dedicated **Cron Job** service type for scheduled email digests.

## Setup Instructions

### Step 1: Deploy the Cron Job Service

The `render.yaml` file has been updated to include a cron job service:

```yaml
- type: cron
  name: email-digest-cron
  env: node
  schedule: "*/5 * * * *"  # Runs every 5 minutes
  buildCommand: npm ci
  startCommand: node send-digest-cron.js
```

### Step 2: Set Environment Variables in Render Dashboard

After pushing the code, go to your Render dashboard and set these environment variables for **BOTH services**:

#### For the Web Service (interview-compass):
1. `RENDER_EXTERNAL_URL` - Your Render app URL (e.g., `https://interview-compass.onrender.com`)
2. `BREVO_API_KEY` - Your Brevo API key for sending emails

#### For the Cron Job Service (email-digest-cron):
1. `SUPABASE_URL` - Your Supabase project URL
2. `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
3. `RENDER_EXTERNAL_URL` - Your Render app URL (same as above)
4. `BREVO_API_KEY` - Your Brevo API key (same as above)
5. `VITE_API_URL` - Set to `/api` or leave blank

### Step 3: Push Changes to GitHub

```bash
git add .
git commit -m "Add Render cron job for email digests"
git push origin main
```

### Step 4: Verify in Render Dashboard

1. Go to your Render dashboard
2. You should see TWO services now:
   - **interview-compass** (Web Service)
   - **email-digest-cron** (Cron Job)
3. Both will deploy automatically
4. Check the logs of `email-digest-cron` to verify it runs every 5 minutes

## How It Works

### Cron Schedule
- **Current**: Runs every 5 minutes (`*/5 * * * *`)
- **Alternative schedules**:
  - Every minute: `* * * * *` (not recommended, too frequent)
  - Every 10 minutes: `*/10 * * * *`
  - Every 15 minutes: `*/15 * * * *`
  - Every hour: `0 * * * *`

### Execution Flow
1. Cron job runs at scheduled interval (every 5 minutes)
2. Script checks current time and queries database for matching schedules
3. If user has scheduled digest at current time, sends email via API endpoint
4. Script exits (Render will run it again at next interval)

### Email Digest Timing
Users can schedule digests at specific times (e.g., 9:00 AM, 6:00 PM). The cron job checks every 5 minutes, so:
- If user schedules 9:00 AM, email will be sent between 9:00-9:05 AM
- For exact timing, use `* * * * *` (every minute) schedule

## Testing

### Test Locally
```bash
# Set environment variables in .env file
node send-digest-cron.js
```

### Test on Render
1. Go to Render dashboard → email-digest-cron service
2. Click "Manual Deploy" or wait for next scheduled run
3. Check logs to see if digests are being sent

### Debug Logs
The script logs:
- `⏰ Starting scheduled digest check...`
- `Found X active preferences.`
- `✅ Match found:` (when time matches)
- `🚀 Sending digest to...` (when sending email)
- `✅ Digest sent successfully`

## Important Notes

### Cron Job Pricing
- **Free Tier**: Limited to certain hours per month
- **Paid Plans**: Unlimited cron job execution
- Check Render's pricing page for current limits

### Fallback for Local Development
The `server.js` still has node-cron jobs for local development. They will work when running locally with `npm run server` or `npm start`.

### Time Zone
- Render cron jobs run in **UTC**
- User scheduled times should be stored in UTC or with timezone info
- Consider adding timezone conversion in the future

## Troubleshooting

### Cron Job Not Running
1. Check Render dashboard for deployment errors
2. Verify environment variables are set correctly
3. Check cron job logs for errors

### Emails Not Sending
1. Check `RENDER_EXTERNAL_URL` points to correct web service
2. Verify `BREVO_API_KEY` is valid
3. Check web service logs when cron job calls the API

### Time Mismatch
1. Verify scheduled times are in HH:MM:00 format in database
2. Check if times are UTC or local timezone
3. Review cron job logs to see time comparison

## Future Improvements

1. **Timezone Support**: Store user timezone and convert scheduled times
2. **Rate Limiting**: Prevent sending duplicate emails within same day
3. **Email Queue**: Use a proper job queue (Bull, BullMQ) for reliability
4. **Health Monitoring**: Send alerts if cron job fails
5. **Batch Processing**: Group multiple digests to reduce API calls

## Alternative Solutions

### Option 1: External Cron Service (EasyCron, cron-job.org)
- Use external service to call your API endpoint
- No need for separate Render cron job
- May have reliability issues

### Option 2: Supabase Edge Functions + pg_cron
- Use Supabase's built-in cron capabilities
- Requires Supabase Pro plan
- Most reliable for database-triggered tasks

### Option 3: Keep Service Always Awake (Paid Plan)
- Upgrade to Render paid plan
- Web service stays running 24/7
- Node-cron jobs in server.js will work
- More expensive but simpler
