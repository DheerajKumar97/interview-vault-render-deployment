# RAG-Based AI Chatbot for Interview Vault

## Overview

The `talk_to_db.js` script has been enhanced from a simple database query tool to a **RAG-based (Retrieval-Augmented Generation) AI Chatbot** that can:

1. **Handle conversational queries** - Greetings, general questions, and casual conversation
2. **Provide application information** - Details about Interview Vault, features, policies, and creator
3. **Execute database queries** - Query your application data in natural language
4. **Maintain context awareness** - Remember conversation history for better responses

## Features

### 🤖 Intelligent Query Classification

The chatbot automatically classifies your questions into:
- **Greetings**: "Hey, how are you?", "Hello", "What's up?"
- **Application Info**: "Who is Dheeraj?", "What is Interview Vault?", "What are the policies?"
- **Database Queries**: "How many applications?", "Show me interviews", "List companies"
- **General Conversation**: Any other conversational input

### 💬 Conversational Capabilities

Ask natural questions like:
- "Hey, how are you?"
- "Who is Dheeraj?"
- "What is the policy of Interview Vault?"
- "What features does this app have?"
- "Tell me about Interview Vault"
- "What can you do?"

### 🗄️ Database Query Capabilities

Query your data naturally:
- "How many applications are in interview scheduled status?"
- "Show me all companies where I have interviews"
- "What are the different statuses and their counts?"
- "How many applications did I submit this month?"
- "List all applications with offers"

### 🧠 Context Awareness

- Maintains conversation history (last 10 messages)
- Uses context to provide better responses
- Remembers previous questions and answers

### 📚 Application Knowledge Base

The chatbot has comprehensive knowledge about:
- Interview Vault features and capabilities
- Dheeraj Kumar K (creator)
- Privacy policies and terms of use
- Cookie policies
- Tech stack and architecture
- Contact and support information

## How to Use

### Interactive Mode

```bash
node talk_to_db.js
```

This starts an interactive session where you can chat with the bot:

```
🤖 RAG-BASED AI CHATBOT FOR INTERVIEW VAULT
============================================================

I can help you with:
  💬 General conversation (greetings, questions about the app)
  📚 Application information (features, policies, about Dheeraj)
  🗄️ Database queries (your applications, interviews, statistics)

Examples:
  • Hey, how are you?
  • Who is Dheeraj?
  • What is the policy of Interview Vault?
  • What features does Interview Vault have?
  • How many applications are in interview scheduled status?
  • Show me all companies where I have interviews
  • What are the different statuses and their counts?

Type "exit" to quit.

❓ Your question: 
```

### Command Line Mode

```bash
node talk_to_db.js "Who is Dheeraj?"
node talk_to_db.js "How many applications do I have?"
```

## Example Conversations

### Example 1: Greeting
```
❓ Question: Hey, how are you?
🔍 Query Type: greeting
💬 Generating conversational response...

💡 Response:
Hello! I'm doing great, thank you for asking! 😊 I'm here to help you with Interview Vault - whether you want to know about the application, check your interview statistics, or just chat. How can I assist you today?
```

### Example 2: Application Information
```
❓ Question: Who is Dheeraj?
🔍 Query Type: app_info
💬 Generating conversational response...

💡 Response:
Dheeraj Kumar K is the creator and developer of Interview Vault. He's an AI enabled Data Engineer passionate about building tools that help job seekers succeed in their career journey. You can learn more about him at: https://dheerajkumar-k.netlify.app/
```

### Example 3: Policy Question
```
❓ Question: What is the policy of Interview Vault?
🔍 Query Type: app_info
💬 Generating conversational response...

💡 Response:
Interview Vault follows strict privacy and security policies:
- All data is encrypted and stored securely
- Row Level Security ensures you can only access your own data
- We're GDPR and CCPA compliant
- No personal data is shared with third parties
- You can export or delete your data anytime

For full details, please check the Privacy Policy and Terms of Use in the footer.
```

### Example 4: Database Query
```
❓ Question: How many applications are in interview scheduled status?
🔍 Query Type: database
🗄️ Processing database query...
🤖 Converting question to SQL...
📊 Executing query...
   SQL: SELECT COUNT(*) as count FROM applications WHERE status = 'Interview Scheduled'

✅ Answer: 5
```

## Technical Implementation

### Architecture

1. **Query Classification** (`classifyQuery`)
   - Uses regex pattern matching
   - Categorizes queries into: greeting, app_info, database, conversation
   - Smart fallback logic

2. **Conversational Response** (`generateConversationalResponse`)
   - Uses Perplexity AI with application knowledge base
   - Includes conversation history for context
   - Fallback responses if API fails

3. **Database Query** (`naturalLanguageToSQL`)
   - Converts natural language to SQL
   - Executes queries via Supabase
   - Formats results for display

4. **Conversation History** (`addToConversationHistory`)
   - Tracks last 10 messages
   - Provides context for better responses
   - Includes timestamps

### RAG (Retrieval-Augmented Generation)

The chatbot uses RAG principles:
- **Knowledge Base**: Comprehensive information about Interview Vault stored in `APPLICATION_KNOWLEDGE`
- **Retrieval**: Classifies queries and retrieves relevant context
- **Generation**: Uses AI (Perplexity) to generate responses based on knowledge base
- **Augmentation**: Combines knowledge base with conversation history for context-aware responses

## Environment Variables

Required in `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Configuration
PERPLEXITY_API_KEY=your_perplexity_api_key
```

## Error Handling

The chatbot includes robust error handling:
- Graceful fallback responses if AI API fails
- Pattern-based fallback for common questions
- Helpful error messages for users
- Conversation history maintained even on errors

## Benefits

1. **User-Friendly**: Natural conversation instead of rigid commands
2. **Context-Aware**: Remembers conversation history
3. **Intelligent**: Automatically determines if query needs database access
4. **Informative**: Provides detailed information about the application
5. **Flexible**: Handles both casual chat and serious data queries
6. **Robust**: Fallback responses ensure it always provides value

## Future Enhancements

Potential improvements:
- Multi-user support with user authentication
- Voice input/output capabilities
- Integration with frontend UI
- More advanced NLP for better query understanding
- Sentiment analysis for user feedback
- Proactive suggestions based on user data

## Notes

- The chatbot maintains conversation context for better responses
- Database queries are automatically converted to SQL
- All responses are logged with timestamps
- The knowledge base can be easily updated in `APPLICATION_KNOWLEDGE`
- Supports both interactive and command-line modes

---

**Created by**: Dheeraj Kumar K  
**Project**: Interview Vault  
**Technology**: Node.js, Supabase, Perplexity AI, RAG Architecture
