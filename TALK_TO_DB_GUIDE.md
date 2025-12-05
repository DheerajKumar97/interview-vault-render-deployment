# 🗣️ Talk to Database - Natural Language Query Tool

Ask questions about your database in plain English and get instant answers!

## 🚀 Quick Start

### **Option 1: Interactive Mode**
```bash
node talk_to_db.js
```

Then type questions like:
- "How many applications are in interview scheduled status?"
- "Show me all companies where I have interviews"
- "What are the different statuses and their counts?"

Type `exit` to quit.

### **Option 2: Command Line Mode**
```bash
node talk_to_db.js "How many applications are in interview scheduled status?"
```

## 📊 Example Questions You Can Ask

### **Counting Questions:**
- "How many applications are in interview scheduled status?"
- "How many total applications do I have?"
- "How many applications did I submit this month?"
- "How many interview events happened this week?"

### **Status Questions:**
- "What are the different statuses and their counts?"
- "Show me all applications with status Offer"
- "How many applications are rejected?"

### **Company Questions:**
- "Show me all companies where I have interviews scheduled"
- "Which companies have I applied to?"
- "Show me applications at Google"

### **Date-based Questions:**
- "Show me applications from last week"
- "How many interviews do I have this month?"
- "What applications did I submit today?"

### **Detailed Queries:**
- "Show me position, company, and salary for all offers"
- "List all interviews with their dates"
- "Show me applications grouped by status"

## 🔧 How It Works

1. **You ask in plain English**
   → "How many applications are in interview scheduled status?"

2. **AI converts to SQL**
   → `SELECT COUNT(*) FROM applications WHERE status = 'Interview Scheduled'`

3. **Query executes on Supabase**
   → Returns: `{ count: 5 }`

4. **Results formatted nicely**
   → "✅ Answer: 5"

## 📋 Database Tables Available

### **applications**
- All your job applications
- Fields: company, position, status, salary, location, application_date

### **interview_events**
- Timeline of all interview-related events
- Fields: event_type, event_date, notes

### **email_digest_preferences**
- Your email digest settings
- Fields: frequency, scheduled_time, is_active

## 🎯 Example Session

```bash
$ node talk_to_db.js

🗣️  NATURAL LANGUAGE DATABASE QUERY TOOL
============================================================

❓ Your question: How many applications are in interview scheduled status?

🤖 Converting question to SQL...
📊 Executing query...
   SQL: SELECT COUNT(*) as count FROM applications WHERE status = 'Interview Scheduled'

✅ Answer: 12
============================================================

❓ Your question: Show me all companies where I have interviews

🤖 Converting question to SQL...
📊 Executing query...
   SQL: SELECT DISTINCT company FROM applications WHERE status = 'Interview Scheduled'

📊 Results:
┌─────────┬────────────┐
│ (index) │  company   │
├─────────┼────────────┤
│    0    │  'Google'  │
│    1    │ 'Microsoft'│
│    2    │  'Amazon'  │
└─────────┴────────────┘

Found 3 records
============================================================

❓ Your question: exit

👋 Goodbye!
```

## ⚙️ Requirements

### **Environment Variables Needed:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PERPLEXITY_API_KEY=["pplx-..."]
```

### **Dependencies:**
All already installed in your project:
- `@supabase/supabase-js`
- `axios`
- `dotenv`

## 🛠️ Advanced Usage

### **Test Specific Query:**
```bash
node talk_to_db.js "Show me applications with salary > 100000"
```

### **Export Results:**
```bash
node talk_to_db.js "Show all applications" > results.json
```

### **Quick Status Check:**
```bash
node talk_to_db.js "How many applications per status?"
```

## 🎨 Status Values

The `applications.status` field can have these values:
- `Applied`
- `Shortlisted`
- `Interview Scheduled`
- `Interview Rescheduled`
- `Offer`
- `Rejected`
- `Call`

The `interview_events.event_type` field can have:
- `APPLIED`
- `SHORTLISTED`
- `INTERVIEW_SCHEDULED`
- `INTERVIEW_RESCHEDULED`
- `OFFER`
- `REJECTED`
- `CALL`

## 🐛 Troubleshooting

### **Error: "No Perplexity API key found"**
**Solution:** Make sure `.env` has `PERPLEXITY_API_KEY` set

### **Error: "Could not detect table from query"**
**Solution:** Rephrase your question to be more specific about applications or events

### **Error: "Supabase connection failed"**
**Solution:** Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`

### **No results but you know data exists**
**Solution:** Check the exact status values in your database (case-sensitive)

## 💡 Tips

1. **Be specific** - Instead of "show interviews", say "show applications with interview scheduled status"

2. **Use proper status names** - "Interview Scheduled" not "interview scheduled"

3. **Ask for counts first** - "How many..." queries are fast and help you understand your data

4. **Try variations** - If one phrasing doesn't work, rephrase the question

5. **Check the SQL** - The tool shows you the generated SQL, so you can learn from it

## 🔮 Future Enhancements

- [ ] Support for complex JOIN queries
- [ ] Visual charts for results
- [ ] Query history and favorites
- [ ] Export to CSV/Excel
- [ ] Scheduled reports
- [ ] Multi-user support with authentication

## 📚 Learn More

This tool uses:
- **Perplexity AI** - For natural language to SQL conversion
- **Supabase** - For database queries
- **PostgreSQL** - Underlying database

## 🤝 Contributing

Have ideas for better questions or features? Edit the schema or add more examples!
