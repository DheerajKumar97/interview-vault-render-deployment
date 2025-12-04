// Test script for Netlify function locally
// Run with: node test-netlify-function.js

import 'dotenv/config'; // Load environment variables from .env
import { handler } from './netlify/functions/generate-interview-questions.js';

async function testFunction() {
    console.log('🧪 Testing Netlify Function Locally...\n');

    const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
            resumeText: 'Software Engineer with 5 years experience in Python, JavaScript, React, Node.js, SQL',
            jobDescription: 'Looking for a Full Stack Developer with experience in React and Node.js',
            companyName: 'Test Company',
            jobTitle: 'Full Stack Developer'
        })
    };

    const context = {};

    try {
        const result = await handler(event, context);
        console.log('✅ Status Code:', result.statusCode);
        console.log('📦 Response:', JSON.parse(result.body));
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testFunction();
