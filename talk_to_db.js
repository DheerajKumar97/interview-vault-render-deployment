// Natural Language Database Query Tool
// Ask questions about your database in plain English!

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

// Database schema information
const DATABASE_SCHEMA = `
You are a SQL expert. Convert natural language questions into Supabase/PostgreSQL queries.

DATABASE SCHEMA:

1. applications table:
   - id (uuid, primary key)
   - user_id (uuid, foreign key to auth.users)
   - company (text)
   - position (text)
   - status (text) - values: Applied, Shortlisted, Interview Scheduled, Interview Rescheduled, Offer, Rejected, Call
   - application_date (date)
   - salary (text)
   - location (text)
   - job_type (text)
   - notes (text)
   - created_at (timestamp)
   - updated_at (timestamp)

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

RULES:
1. Always return valid PostgreSQL SQL
2. Use proper table and column names from schema
3. For counting, use COUNT(*)
4. For status matching, use exact status values (case-sensitive)
5. Interview Scheduled status in applications table corresponds to INTERVIEW_SCHEDULED in interview_events
6. Return ONLY the SQL query, no explanation
7. Use single quotes for string values
8. For "interview scheduled" queries, check applications.status = 'Interview Scheduled' OR interview_events.event_type = 'INTERVIEW_SCHEDULED'

EXAMPLES:

Question: "How many applications are in interview scheduled status?"
SQL: SELECT COUNT(*) as count FROM applications WHERE status = 'Interview Scheduled';

Question: "Show me all companies where I have interviews scheduled"
SQL: SELECT DISTINCT company FROM applications WHERE status = 'Interview Scheduled';

Question: "How many applications did I submit this month?"
SQL: SELECT COUNT(*) as count FROM applications WHERE DATE_TRUNC('month', application_date) = DATE_TRUNC('month', CURRENT_DATE);

Question: "What are the different statuses and their counts?"
SQL: SELECT status, COUNT(*) as count FROM applications GROUP BY status ORDER BY count DESC;

Question: "Show me applications with offers"
SQL: SELECT company, position, salary, location FROM applications WHERE status = 'Offer';

Question: "How many interview events happened this week?"
SQL: SELECT COUNT(*) as count FROM interview_events WHERE event_date >= DATE_TRUNC('week', CURRENT_DATE);

NOW CONVERT THE FOLLOWING QUESTION TO SQL:
`;

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
    let query = supabase.from(table).select('*');

    // Parse WHERE clause
    const whereMatch = sqlQuery.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();

      // Simple status filter
      if (whereClause.includes('status =')) {
        const statusMatch = whereClause.match(/status\s*=\s*'([^']+)'/i);
        if (statusMatch) {
          query = query.eq('status', statusMatch[1]);
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
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      return [{ count }];
    }

    // Execute query
    const { data, error } = await query;

    if (error) throw error;

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

  // Regular results
  console.log('\n📊 Results:');
  console.table(data);
  return `Found ${data.length} records`;
}

// Main function to ask questions
async function askQuestion(question) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('❓ Question:', question);
    console.log('='.repeat(60));

    // Convert to SQL
    const sqlQuery = await naturalLanguageToSQL(question);

    // Execute query
    const results = await executeQuery(sqlQuery);

    // Format and display results
    const summary = formatResults(results, question);
    console.log('\n' + summary);
    console.log('='.repeat(60) + '\n');

    return results;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Interactive mode
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n' + '='.repeat(60));
  console.log('🗣️  NATURAL LANGUAGE DATABASE QUERY TOOL');
  console.log('='.repeat(60));
  console.log('\nAsk questions about your database in plain English!');
  console.log('\nExamples:');
  console.log('  • How many applications are in interview scheduled status?');
  console.log('  • Show me all companies where I have interviews');
  console.log('  • What are the different statuses and their counts?');
  console.log('  • How many applications did I submit this month?');
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
