// RAG-based AI Chatbot with Database Query Capabilities
// Conversational AI that understands context and can query your database!

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Get Supabase credentials (support both VITE_ and non-VITE_ prefixed)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Check required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('   Please set in .env file:');
  console.error('   - SUPABASE_URL (or VITE_SUPABASE_URL)');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY)');
  console.error('   - PERPLEXITY_API_KEY');
  console.error('\n   Current values:');
  console.error('   - SUPABASE_URL:', SUPABASE_URL ? '✅ Found' : '❌ Missing');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing');
  console.error('   - PERPLEXITY_API_KEY:', PERPLEXITY_API_KEY ? '✅ Found' : '❌ Missing');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully\n');

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Conversation history for context awareness
const conversationHistory = [];
const MAX_HISTORY_LENGTH = 10;

// Application Knowledge Base (RAG Context)
const APPLICATION_KNOWLEDGE = `
INTERVIEW VAULT - APPLICATION KNOWLEDGE BASE

## About Interview Vault
Interview Vault is a comprehensive interview tracking and management platform designed to help job seekers organize their application journey, analyze their skills against job requirements, and make data-driven decisions to land their dream job.

## Key Features:
- 📊 Data-Driven Insights: Visualize your interview pipeline with interactive charts
- 🤖 AI-Powered Analysis: Get skill gap analysis and project suggestions using Gemini AI
- 📧 Smart Notifications: Automated email digests and alerts
- 📱 Responsive Design: Works seamlessly on desktop, tablet, and mobile
- 🔒 Secure & Private: Your data is protected with enterprise-grade security
- 🌍 Multi-Language: Support for English and Hindi

## Core Functionality:
- Secure Authentication with email verification, password reset, OTP support
- Application Tracking for unlimited job applications across 350+ companies
- Event Management to monitor 7+ interview stages with timeline view
- Business Intelligence Dashboard with real-time analytics and 10+ chart types
- AI Skill Analysis to compare your resume against job descriptions
- AI Project Suggestions for personalized project ideas using Gemini AI
- Data Import/Export with Excel (.xlsx/.csv) file support
- Email Notifications with automated weekly digests and PDF reports
- Multi-Language Support for English and Hindi interface
- Responsive Design that works on all devices

## Advanced Features:
- ATS Score Calculation to check resume compatibility
- Custom Themes with Light/Dark mode support
- Calendar Integration for interview scheduling
- Real-time Notifications for instant updates
- PDF Export to download reports and analytics
- Advanced Filtering with multi-select filters for companies and statuses
- Company Size Analysis to track applications by company size
- Goal Tracking to set and monitor interview targets

## Tech Stack:
Frontend: React 18+ with TypeScript, Vite 5.4.19, Tailwind CSS, shadcn/ui
Backend: Supabase (PostgreSQL), Node.js, Express.js
AI: Google Gemini AI, Perplexity AI
Charts: Recharts
PDF: jsPDF, html2canvas
Excel: xlsx, ExcelJS

## About Dheeraj Kumar K
Dheeraj Kumar K is the creator and developer of Interview Vault. He is an AI enabled Data Engineer passionate about building tools that help job seekers succeed in their career journey. You can learn more about Dheeraj at: https://dheerajkumar-k.netlify.app/

## Privacy & Security Policies:
- All user data is encrypted and stored securely in Supabase PostgreSQL database
- Row Level Security (RLS) ensures users can only access their own data
- Email verification is required for account activation
- Passwords are hashed using industry-standard encryption
- No personal data is shared with third parties without explicit consent
- Users can export or delete their data at any time
- GDPR and CCPA compliant

## Terms of Use:
- Interview Vault is free to use for personal job search tracking
- Users must provide accurate information during registration
- Users are responsible for maintaining the confidentiality of their account
- Prohibited activities include: sharing accounts, automated scraping, malicious use
- Interview Vault reserves the right to terminate accounts that violate terms
- Service is provided "as is" without warranties

## Cookie Policy:
- Essential cookies for authentication and session management
- Analytics cookies to improve user experience (can be disabled)
- No third-party advertising cookies
- Users can manage cookie preferences in account settings

## Contact & Support:
- 24/7 Support available
- Email: interviewvault.2026@gmail.com
- Support Hours: Monday-Friday, 9:00 AM - 5:00 PM EST
- Website: https://dheerajkumark-interview-vault.netlify.app/
- GitHub: DheerajKumar97

## Application Statistics:
- Track applications across 350+ top companies
- Monitor 7 interview stages: Applied, Shortlisted, Interview Scheduled, Interview Rescheduled, Offer, Rejected, Call
- Real-time dashboard with KPIs and analytics
- Automated email digests and notifications
`;

// Add conversation context to history
function addToConversationHistory(role, content) {
  conversationHistory.push({ role, content, timestamp: new Date().toISOString() });

  // Keep only last MAX_HISTORY_LENGTH messages
  if (conversationHistory.length > MAX_HISTORY_LENGTH) {
    conversationHistory.shift();
  }
}

// Database schema information
const DATABASE_SCHEMA = `
You are a SQL expert. Convert natural language questions into Supabase/PostgreSQL queries.

DATABASE SCHEMA:


1. applications table:
   - id (uuid, primary key)
   - user_id (uuid, foreign key to auth.users)
   - company (text) - IMPORTANT: Always include this in SELECT for user-facing queries
   - name (text) - alternative company name field
   - position (text) - job title
   - current_status (text) - IMPORTANT: The main status field
   - status (text) - legacy status field (use current_status instead)
   - application_date (date)
   - salary (text)
   - location (text)
   - job_type (text)
   - notes (text)
   - created_at (timestamp)
   - updated_at (timestamp)

VALID STATUS VALUES (case-sensitive):
- "HR Screening Done"
- "Shortlisted"
- "Interview Scheduled"
- "Interview Rescheduled"
- "Selected" (means you got selected/passed the interview)
- "Offer Released" (means you received a job offer)
- "Ghosted"
- "Rejected"

2. interview_events table:
   - id (uuid, primary key)
   - application_id (uuid, foreign key to applications)
   - user_id (uuid, foreign key to auth.users)
   - event_type (text) - values: APPLIED, SHORTLISTED, INTERVIEW_SCHEDULED, INTERVIEW_RESCHEDULED, OFFER, REJECTED, CALL
   - event_date (timestamp)
   - notes (text)
   - created_at (timestamp)

3. email_digest_preferences table:
   - id (uuid, primary key)
   - user_id (uuid, foreign key to auth.users)
   - frequency (text) - values: daily, weekly, monthly
   - scheduled_time (time)
   - is_active (boolean)
   - created_at (timestamp)

CRITICAL RULES:
1. Always return valid PostgreSQL SQL
2. Use proper table and column names from schema
3. For counting, use COUNT(*)
4. For status matching, use EXACT status values (case-sensitive) from the VALID STATUS VALUES list
5. ALWAYS use current_status field (NOT status field) for status queries
6. When user asks about "selected" or "got selected", use current_status = 'Selected'
7. When user asks about "offers" or "offer released", use current_status = 'Offer Released'
8. Return ONLY the SQL query, no explanation
9. Use single quotes for string values
10. ALWAYS include company name (company or name field) in SELECT when showing results to user
11. Use COALESCE(company, name) to handle both company fields

EXAMPLES:

Question: "How many applications are in interview scheduled status?"
SQL: SELECT COUNT(*) as count FROM applications WHERE current_status = 'Interview Scheduled';

Question: "Show me all companies where I have interviews scheduled"
SQL: SELECT DISTINCT COALESCE(company, name) as company_name FROM applications WHERE current_status = 'Interview Scheduled';

Question: "How many companies selected me?" or "I got selected in how many companies?"
SQL: SELECT COUNT(*) as count FROM applications WHERE current_status = 'Selected';

Question: "Show me companies where I got selected" or "Which companies selected me?"
SQL: SELECT COALESCE(company, name) as company_name, position, application_date FROM applications WHERE current_status = 'Selected' ORDER BY application_date DESC;

Question: "How many offers did I receive?" or "How many companies gave me offers?"
SQL: SELECT COUNT(*) as count FROM applications WHERE current_status = 'Offer Released';

Question: "Show me companies that gave me offers"
SQL: SELECT COALESCE(company, name) as company_name, position, salary, location FROM applications WHERE current_status = 'Offer Released' ORDER BY application_date DESC;

Question: "How many applications did I submit this month?"
SQL: SELECT COUNT(*) as count FROM applications WHERE DATE_TRUNC('month', application_date) = DATE_TRUNC('month', CURRENT_DATE);

Question: "What are the different statuses and their counts?"
SQL: SELECT current_status, COUNT(*) as count FROM applications GROUP BY current_status ORDER BY count DESC;

Question: "Show me all my applications"
SQL: SELECT COALESCE(company, name) as company_name, position, current_status, application_date FROM applications ORDER BY application_date DESC LIMIT 20;

Question: "How many interview events happened this week?"
SQL: SELECT COUNT(*) as count FROM interview_events WHERE event_date >= DATE_TRUNC('week', CURRENT_DATE);

NOW CONVERT THE FOLLOWING QUESTION TO SQL:
`;

// Classify query type: conversational vs database query
function classifyQuery(question) {
  const lowerQuestion = question.toLowerCase().trim();

  // Greeting patterns
  const greetingPatterns = [
    /^(hi|hello|hey|good morning|good afternoon|good evening)/,
    /how are you/,
    /what'?s up/,
    /how'?s it going/
  ];

  // Application info patterns
  const appInfoPatterns = [
    /who (is|are|created|made|built|developed|founded)/,
    /who.*?(dheeraj|creator|developer|founder|made|built|owner)/,
    /about (dheeraj|creator|developer|founder)/,
    /founder of (this|the)? ?(app|application|interview vault)/,
    /creator of (this|the)? ?(app|application|interview vault)/,
    /developer of (this|the)? ?(app|application|interview vault)/,
    /who.*?behind (this|the)? ?(app|application)/,
    /what is (interview vault|this app|this application)/,
    /tell me about (interview vault|this app|this application)/,
    /what (can|does) (interview vault|this app|this application)/,
    /features of (interview vault|this app|this application)/,
    /how (does|do) (interview vault|this app|this application) work/,
    /policy|policies|privacy|terms|cookie/,
    /what is.*policy/,
    /terms of use/,
    /privacy policy/,
    /how to use/,
    /help me/,
    /what can you do/,
    /capabilities/,
    /about (this|the)? ?(app|application|platform|tool)/,
    /can i use (this|the|interview vault)/,
    /is (this|interview vault) (free|paid)/,
    /how (do|can) i use/,
    /usage|license|licensing/,
    /permission|allowed/,
    /for my own purpose/,
    /support (email|mail|contact)/,
    /contact (email|mail|support|us|information)/,
    /how (do|can) i contact/,
    /email.*?(support|contact|help)/,
    /give me.*?(email|contact|support)/,
    /what is.*?(email|contact|support)/
  ];

  // Database query patterns
  const databasePatterns = [
    /how many (applications|interviews|companies)/,
    /show me (all|my) (applications|interviews|companies)/,
    /list (all|my) (applications|interviews|companies)/,
    /what (are|is) (the|my) (status|statuses)/,
    /count of/,
    /total (applications|interviews)/,
    /applications (in|with|for)/,
    /interviews (scheduled|this week|this month)/,
    /companies (where|with)/,
    /when (did|was)/,
    /status of/,
    /offers (received|from)/
  ];

  // Check patterns
  for (const pattern of greetingPatterns) {
    if (pattern.test(lowerQuestion)) {
      return 'greeting';
    }
  }

  for (const pattern of appInfoPatterns) {
    if (pattern.test(lowerQuestion)) {
      return 'app_info';
    }
  }

  for (const pattern of databasePatterns) {
    if (pattern.test(lowerQuestion)) {
      return 'database';
    }
  }

  // Default: if contains SQL-like keywords, treat as database query
  if (lowerQuestion.includes('application') ||
    lowerQuestion.includes('interview') ||
    lowerQuestion.includes('company') ||
    lowerQuestion.includes('status') ||
    lowerQuestion.includes('count') ||
    lowerQuestion.includes('show') ||
    lowerQuestion.includes('list')) {
    return 'database';
  }

  // Otherwise, treat as general conversation
  return 'conversation';
}

// Generate conversational response using AI with application context
async function generateConversationalResponse(question) {
  try {
    let perplexityKeys = [];
    try {
      perplexityKeys = JSON.parse(PERPLEXITY_API_KEY || '[]');
    } catch (e) {
      perplexityKeys = PERPLEXITY_API_KEY ? [PERPLEXITY_API_KEY] : [];
    }

    if (perplexityKeys.length === 0) {
      return "I'm here to help! However, I need an API key to provide detailed responses. For now, I can tell you that Interview Vault is a comprehensive interview tracking platform created by Dheeraj Kumar K. It helps job seekers track applications, analyze skills, and make data-driven career decisions.";
    }

    console.log('🤖 Generating conversational response...');

    // Build context from conversation history
    const historyContext = conversationHistory.length > 0
      ? `\n\nPrevious conversation:\n${conversationHistory.map(h => `${h.role}: ${h.content}`).join('\n')}`
      : '';

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant for Interview Vault, an interview tracking and management platform. 
            
You are friendly, conversational, and knowledgeable about the application. Use the following knowledge base to answer questions:

${APPLICATION_KNOWLEDGE}

When answering:
- Be warm and conversational
- Provide accurate information from the knowledge base
- If asked about Dheeraj, mention he's the creator and an AI enabled Data Engineer
- If asked about policies, provide clear, concise information
- If asked about usage/licensing, mention it's free for personal job search tracking
- If asked how you are, respond naturally and ask how you can help
- Keep responses concise but informative (2-4 sentences for greetings, more for detailed questions)
- Always be helpful and encouraging

${historyContext}`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${perplexityKeys[0]}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const answer = response.data.choices[0].message.content.trim();
    return answer;
  } catch (error) {
    console.error('❌ Error generating response:', error.message);

    // Fallback responses based on question type
    const lowerQuestion = question.toLowerCase();


    if (lowerQuestion.includes('founder') || lowerQuestion.includes('creator') ||
      (lowerQuestion.includes('who') && (lowerQuestion.includes('made') || lowerQuestion.includes('built') || lowerQuestion.includes('developed')))) {
      return "Dheeraj Kumar K is the founder and creator of Interview Vault. He's an AI enabled Data Engineer passionate about building tools that help job seekers succeed in their career journey. You can learn more about him at: https://dheerajkumar-k.netlify.app/";
    }

    if (lowerQuestion.includes('dheeraj')) {
      return "Dheeraj Kumar K is the creator and developer of Interview Vault. He's an AI enabled Data Engineer passionate about building tools that help job seekers succeed in their career journey. You can learn more about him at: https://dheerajkumar-k.netlify.app/";
    }

    if (lowerQuestion.includes('policy') || lowerQuestion.includes('privacy') || lowerQuestion.includes('terms')) {
      return "Interview Vault follows strict privacy and security policies:\n- All data is encrypted and stored securely\n- Row Level Security ensures you can only access your own data\n- We're GDPR and CCPA compliant\n- No personal data is shared with third parties\n- You can export or delete your data anytime\n\nFor full details, please check the Privacy Policy and Terms of Use in the footer.";
    }

    if (lowerQuestion.includes('use') && (lowerQuestion.includes('can i') || lowerQuestion.includes('my own') || lowerQuestion.includes('purpose'))) {
      return "Yes! Interview Vault is free to use for personal job search tracking. You can:\n- Track unlimited job applications\n- Use all features without restrictions\n- Export your data anytime\n- Use it for your own job search purposes\n\nJust make sure to:\n- Provide accurate information during registration\n- Maintain the confidentiality of your account\n- Not share your account or use it for malicious purposes\n\nInterview Vault is designed to help job seekers like you succeed in their career journey!";
    }

    if (lowerQuestion.includes('support') || lowerQuestion.includes('contact') ||
      (lowerQuestion.includes('email') && (lowerQuestion.includes('give') || lowerQuestion.includes('what')))) {
      return "📧 Contact & Support Information:\n\nEmail: interviewvault.2026@gmail.com\nSupport Hours: Monday-Friday, 9:00 AM - 5:00 PM EST\n\nOur support team is here to help you with:\n- Technical issues and troubleshooting\n- Account-related questions\n- Feature requests and feedback\n- General inquiries about Interview Vault\n\nFeel free to reach out anytime! We typically respond within 24 hours during business days.";
    }

    if (lowerQuestion.includes('how are you') || lowerQuestion.includes('hello') || lowerQuestion.includes('hi')) {
      return "Hello! I'm doing great, thank you for asking! 😊 I'm here to help you with Interview Vault - whether you want to know about the application, check your interview statistics, or just chat. How can I assist you today?";
    }

    if (lowerQuestion.includes('what') && (lowerQuestion.includes('interview vault') || lowerQuestion.includes('this app'))) {
      return "Interview Vault is a comprehensive interview tracking and management platform that helps job seekers organize their application journey. Key features include:\n- Track applications across 350+ companies\n- AI-powered skill analysis\n- Real-time analytics dashboard\n- Automated email notifications\n- ATS score calculation\n- Multi-language support\n\nIt's designed to help you make data-driven decisions and land your dream job!";
    }

    return "I'm here to help! I can answer questions about Interview Vault, its features, policies, or help you query your application data. What would you like to know?";
  }
}


// Function to convert natural language to SQL using AI
async function naturalLanguageToSQL(question) {
  try {
    // Try Perplexity first
    let perplexityKeys = [];
    try {
      perplexityKeys = JSON.parse(PERPLEXITY_API_KEY || '[]');
    } catch (e) {
      perplexityKeys = PERPLEXITY_API_KEY ? [PERPLEXITY_API_KEY] : [];
    }

    if (perplexityKeys.length > 0) {
      console.log('🤖 Converting question to SQL...');

      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: DATABASE_SCHEMA
            },
            {
              role: 'user',
              content: question
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${perplexityKeys[0]}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const sqlQuery = response.data.choices[0].message.content.trim();

      // Clean up the SQL (remove markdown code blocks if present)
      let cleanSQL = sqlQuery
        .replace(/```sql\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();

      // Remove any trailing semicolon for Supabase
      cleanSQL = cleanSQL.replace(/;+$/, '');

      return cleanSQL;
    } else {
      throw new Error('No Perplexity API key found');
    }
  } catch (error) {
    console.error('❌ Error converting to SQL:', error.message);
    throw error;
  }
}

// Function to execute SQL query via Supabase
async function executeQuery(sqlQuery) {
  try {
    console.log('📊 Executing query...');
    console.log('   SQL:', sqlQuery);

    // Use Supabase RPC to execute raw SQL
    const { data, error } = await supabase.rpc('execute_sql', {
      query: sqlQuery
    });

    if (error) {
      // If RPC doesn't exist, try to parse and use Supabase client methods
      return await executeQueryWithClient(sqlQuery);
    }

    return data;
  } catch (error) {
    // Fallback to client-based query
    return await executeQueryWithClient(sqlQuery);
  }
}

// Fallback: Parse SQL and use Supabase client
async function executeQueryWithClient(sqlQuery) {
  try {
    const lowerQuery = sqlQuery.toLowerCase();

    // Detect table name
    let table = '';
    if (lowerQuery.includes('from applications')) {
      table = 'applications';
    } else if (lowerQuery.includes('from interview_events')) {
      table = 'interview_events';
    } else if (lowerQuery.includes('from email_digest_preferences')) {
      table = 'email_digest_preferences';
    }

    if (!table) {
      throw new Error('Could not detect table from query');
    }

    // Build query
    // If applications table, include companies join
    let query;
    if (table === 'applications') {
      // Select all fields plus companies(name)
      query = supabase.from(table).select('*, companies(name)');
    } else {
      query = supabase.from(table).select('*');
    }

    // Parse WHERE clause
    const whereMatch = sqlQuery.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();

      // Status filter (current_status)
      if (whereClause.includes('current_status =') || whereClause.includes("current_status=")) {
        const statusMatch = whereClause.match(/current_status\s*=\s*'([^']+)'/i);
        if (statusMatch) {
          query = query.eq('current_status', statusMatch[1]);
        }
      }
      // Legacy status filter support
      else if (whereClause.includes('status =') || whereClause.includes("status=")) {
        const statusMatch = whereClause.match(/status\s*=\s*'([^']+)'/i);
        if (statusMatch) {
          // Map legacy status query to current_status if possible, or try both
          // But since we know status column doesn't exist, we should use current_status
          query = query.eq('current_status', statusMatch[1]);
        }
      }

      // Event type filter
      if (whereClause.includes('event_type =')) {
        const typeMatch = whereClause.match(/event_type\s*=\s*'([^']+)'/i);
        if (typeMatch) {
          query = query.eq('event_type', typeMatch[1]);
        }
      }
    }

    // Check if it's a COUNT query
    if (lowerQuery.includes('count(*)')) {
      // For count queries, we need to execute the query with count option
      // But we can't easily chain .count() after building the query object in this way without refactoring
      // So we'll fetch data and count length (not efficient for large datasets but works for this scale)
      // OR we can use the count property if we rebuild the query

      const { data, error } = await query;
      if (error) throw error;
      return [{ count: data.length }];
    }

    // Execute query
    const { data, error } = await query;

    if (error) throw error;

    // Post-process for company names if applications table
    if (table === 'applications' && data) {
      return data.map(row => ({
        ...row,
        company_name: row.companies?.name || row.company || row.name || 'Unknown Company'
      }));
    }

    return data;
  } catch (error) {
    console.error('❌ Error executing query:', error.message);
    throw error;
  }
}


// Function to format results for display
function formatResults(data, question) {
  if (!data || data.length === 0) {
    return '📭 No results found.';
  }

  // If it's a count query
  if (data.length === 1 && data[0].count !== undefined) {
    return `✅ Answer: ${data[0].count}`;
  }

  // If it's a grouped result
  if (data[0].count !== undefined && Object.keys(data[0]).length > 1) {
    console.log('\n📊 Results:');
    console.table(data);
    return `Found ${data.length} groups`;
  }

  // Regular results with company names
  console.log('\n📊 Results:');
  console.table(data);

  // If results contain company_name field, list them
  if (data[0].company_name) {
    const companies = data.map((row, index) => {
      const companyInfo = `${index + 1}. ${row.company_name}`;
      const position = row.position ? ` - ${row.position}` : '';
      const status = row.current_status ? ` (${row.current_status})` : '';
      return companyInfo + position + status;
    }).join('\n   ');

    return `Found ${data.length} records:\n\n   ${companies}`;
  }

  return `Found ${data.length} records`;
}

// Main function to ask questions with intelligent routing
async function askQuestion(question) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('❓ Question:', question);
    console.log('='.repeat(60));

    // Add user question to conversation history
    addToConversationHistory('user', question);

    // Classify the query type
    const queryType = classifyQuery(question);
    console.log('🔍 Query Type:', queryType);

    let response;

    // Route based on query type
    if (queryType === 'greeting' || queryType === 'app_info' || queryType === 'conversation') {
      // Handle conversational queries
      console.log('💬 Generating conversational response...');
      response = await generateConversationalResponse(question);

      console.log('\n💡 Response:');
      console.log(response);
      console.log('='.repeat(60) + '\n');

      // Add assistant response to history
      addToConversationHistory('assistant', response);

      return { type: 'conversation', response };
    } else {
      // Handle database queries
      console.log('🗄️ Processing database query...');

      // Convert to SQL
      const sqlQuery = await naturalLanguageToSQL(question);

      // Execute query
      const results = await executeQuery(sqlQuery);

      // Format and display results
      const summary = formatResults(results, question);
      console.log('\n' + summary);
      console.log('='.repeat(60) + '\n');

      // Add to conversation history
      const responseText = `Database query executed. ${summary}`;
      addToConversationHistory('assistant', responseText);

      return { type: 'database', results, summary };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);

    // Provide helpful error response
    const errorResponse = "I encountered an error processing your request. Could you please rephrase your question or ask something else?";
    console.log('\n' + errorResponse);
    console.log('='.repeat(60) + '\n');

    addToConversationHistory('assistant', errorResponse);

    return { type: 'error', error: error.message };
  }
}


// Interactive mode
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n' + '='.repeat(60));
  console.log('🤖 RAG-BASED AI CHATBOT FOR INTERVIEW VAULT');
  console.log('='.repeat(60));
  console.log('\nI can help you with:');
  console.log('  💬 General conversation (greetings, questions about the app)');
  console.log('  📚 Application information (features, policies, about Dheeraj)');
  console.log('  🗄️ Database queries (your applications, interviews, statistics)');
  console.log('\nExamples:');
  console.log('  • Hey, how are you?');
  console.log('  • Who is Dheeraj?');
  console.log('  • What is the policy of Interview Vault?');
  console.log('  • What features does Interview Vault have?');
  console.log('  • How many applications are in interview scheduled status?');
  console.log('  • Show me all companies where I have interviews');
  console.log('  • What are the different statuses and their counts?');
  console.log('\nType "exit" to quit.\n');

  const askNextQuestion = () => {
    rl.question('❓ Your question: ', async (question) => {
      if (question.toLowerCase() === 'exit') {
        console.log('\n👋 Goodbye!\n');
        rl.close();
        process.exit(0);
        return;
      }

      if (!question.trim()) {
        askNextQuestion();
        return;
      }

      try {
        await askQuestion(question);
      } catch (error) {
        console.error('❌ Failed to process question:', error.message);
      }

      askNextQuestion();
    });
  };

  askNextQuestion();
}

// Command line mode
async function commandLineMode() {
  const question = process.argv.slice(2).join(' ');

  if (!question) {
    console.log('Usage: node talk_to_db.js "your question here"');
    console.log('   Or: node talk_to_db.js          (for interactive mode)');
    process.exit(1);
  }

  await askQuestion(question);
  process.exit(0);
}

// Run the script
if (process.argv.length > 2) {
  commandLineMode();
} else {
  interactiveMode();
}
