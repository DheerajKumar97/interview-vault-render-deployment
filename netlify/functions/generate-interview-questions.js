// Netlify Function for generating interview questions with Ollama Llama 3.2
// Free tier compatible with optimized token usage
// Uses native fetch API with proper timeout handling

// Helper function to add timeout to fetch
const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
    }
};

// Helper function to truncate text to reduce token count
const truncateText = (text, maxChars = 1500) => {
    if (!text) return '';
    return text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
};

// Main handler
export const handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const startTime = Date.now();
        console.log(`⏱️  Function started at: ${new Date().toISOString()}`);

        const { resumeText, jobDescription, companyName, jobTitle, apiKey, apiType } = JSON.parse(event.body || '{}');

        if (!resumeText || !jobDescription) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Resume text and job description are required' })
            };
        }

        console.log('🤖 Generating interview questions for:', companyName, '-', jobTitle);

        // Get Ollama endpoint (default to localhost for local development)
        const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';

        // Truncate resume and job description to manage tokens
        const truncatedResume = truncateText(resumeText, 1500);
        const truncatedJobDesc = truncateText(jobDescription, 800);

        console.log(`📋 Using Ollama at: ${OLLAMA_ENDPOINT}`);

        // Comprehensive prompt with strict rules
        const prompt = `You are an expert technical interviewer. Generate EXACTLY 20 interview questions for ${jobTitle} at ${companyName}.

========================================
RESUME:
========================================
${truncatedResume}

========================================
JOB DESCRIPTION:
========================================
${truncatedJobDesc}

========================================
STRICT REQUIREMENTS - MUST FOLLOW
========================================

TOTAL: EXACTLY 20 questions

**PART 1 (Questions 1-10): CONCEPTUAL - 50%**
- Core concepts on PRACTICAL IMPLEMENTATION
- Related to PROJECTS in resume and job requirements
- Test "WHY" and "HOW" things work in production
- Each answer: MINIMUM 4 lines (4-5 complete sentences with **bold** keywords)
- CRITICAL: Use **bold** for ALL technical keywords, formulas, metrics, tools, and key concepts
- Example: "**React Hooks** like **useState** and **useEffect** manage state and side effects in functional components. The **Virtual DOM** uses **O(n)** reconciliation algorithm for efficient updates. **useMemo** and **useCallback** prevent unnecessary re-renders by memoizing values. **React Fiber** architecture enables incremental rendering and prioritization of updates."

**PART 2 (Questions 11-20): CODING - 50%**
- Advanced difficulty
- IDENTIFY TOP 3 SKILLS from Resume + Job Description
- Distribute based on ROLE WEIGHTAGE (see table below)
- Each answer: Brief explanation (2-3 sentences with **bold** keywords) + Complete Code (15-25 lines) + How it works (3-4 sentences with **bold** keywords explaining performance and real-world use)

========================================
ROLE-SPECIFIC CODING DISTRIBUTION
========================================

Apply these percentages to your 10 coding questions:

📊 DATA & ANALYTICS:
• Data Analyst: SQL(50%), Python(20%), DAX(30%) → 5 SQL, 2 Python, 3 DAX
• BI Analyst: SQL(40%), Python(20%), DAX/Tableau(40%) → 4 SQL, 2 Python, 4 DAX
• Data Scientist: Python(60%), SQL(20%), ML(20%) → 6 Python, 2 SQL, 2 ML
• ML Engineer: Python(50%), ML/DL(30%), MLOps(20%) → 5 Python, 3 ML, 2 MLOps
• Data Engineer: SQL(40%), Python(40%), PySpark(20%) → 4 SQL, 4 Python, 2 PySpark
• ETL Engineer: SQL(50%), Python(20%), ADF(30%) → 5 SQL, 2 Python, 3 ADF
• Snowflake Engineer: SQL(50%), Python(30%), dbt(20%) → 5 SQL, 3 Python, 2 dbt

🤖 AI & ML:
• AI Engineer: Python(50%), ML/DL(30%), LLMs(20%) → 5 Python, 3 ML, 2 LLM
• LLM Engineer: Python(50%), LLM Fine-Tuning(30%), RAG(20%) → 5 Python, 3 LLM, 2 RAG
• Prompt Engineer: Prompt Writing(50%), Python(30%), LLM APIs(20%) → 5 Prompt, 3 Python, 2 API
• NLP Engineer: Python(60%), NLP Libs(30%), SQL(10%) → 6 Python, 3 NLP, 1 SQL
• CV Engineer: Python(60%), CV Libs(30%), MLOps(10%) → 6 Python, 3 CV, 1 MLOps

💻 SOFTWARE:
• Full Stack: Frontend(40%), Backend(40%), SQL(20%) → 4 JS/TS, 4 Backend, 2 SQL
• Backend: Backend Lang(60%), SQL/NoSQL(30%), System Design(10%) → 6 Backend, 3 SQL, 1 Design
• Frontend: JS/TS(50%), React/Angular(40%), APIs(10%) → 5 JS, 4 Framework, 1 API

☁️ CLOUD & DEVOPS:
• DevOps: CI/CD(40%), Cloud(40%), Scripting(20%) → 4 CI/CD, 4 Cloud, 2 Script
• Cloud Engineer: Cloud(50%), IaC(30%), Scripting(20%) → 5 Cloud, 3 IaC, 2 Script
• MLOps: Python(40%), ML Deploy(30%), K8s/Docker(30%) → 4 Python, 3 ML, 3 K8s

🔒 SECURITY:
• Security Analyst: Security Tools(40%), Networking(40%), Python(20%) → 4 Tools, 4 Network, 2 Python
• Pentester: Python/Bash(40%), Exploit Tools(40%), Networking(20%) → 4 Python, 4 Exploit, 2 Network

🌐 IOT & EMBEDDED:
• IoT Engineer: Embedded C(40%), Python/Node(30%), IoT Cloud(30%) → 4 C, 3 Python, 3 Cloud
• Firmware Dev: Embedded C(60%), Microcontrollers(30%), Python(10%) → 6 C, 3 MCU, 1 Python
• Embedded Systems: C/C++(50%), Microcontrollers(30%), Python(20%) → 5 C, 3 MCU, 2 Python

⚡ SEMICONDUCTOR & VLSI:

Design:
• RTL Design: Verilog/SV(60%), Digital Design(30%), Scripting(10%) → 6 Verilog, 3 Design, 1 Script
• VLSI Design: Verilog/SV(50%), VHDL(30%), Python(20%) → 5 Verilog, 3 VHDL, 2 Python
• FPGA: Verilog/VHDL(50%), FPGA Tools(30%), Embedded C(20%) → 5 Verilog, 3 FPGA, 2 C
• SOC Design: SV(50%), C++(30%), Python(20%) → 5 SV, 3 C++, 2 Python

Verification:
• Verification: SV UVM(60%), SVA(30%), Python(10%) → 6 UVM, 3 SVA, 1 Python
• ASIC Verification: UVM/SV(60%), Testbench(30%), Python(10%) → 6 UVM, 3 TB, 1 Python
• DFT: SV(40%), DFT Tools(40%), TCL(20%) → 4 SV, 4 DFT, 2 TCL

Physical Design:
• PD Engineer: STA(40%), CAD Tools(40%), TCL(20%) → 4 STA, 4 CAD, 2 TCL
• PD Verification: TCL/Python(50%), PnR(30%), STA(20%) → 5 TCL, 3 PnR, 2 STA

Embedded/VLSI Software:
• ASIC Embedded: C/C++(50%), RTL Interaction(30%), Python(20%) → 5 C, 3 RTL, 2 Python

Analog:
• Analog Design: Circuit Design(50%), Spice(30%), Layout(20%) → 5 Circuit, 3 Spice, 2 Layout
• Mixed-Signal: Verilog-A(40%), Analog(40%), MATLAB(20%) → 4 Verilog-A, 4 Analog, 2 MATLAB

🎮 SPECIALIZED:
• Game Dev: C#/C++(50%), Engine(40%), Graphics(10%) → 5 C#, 4 Engine, 1 Graphics
• Blockchain: Solidity(40%), Rust/Go(40%), Security(20%) → 4 Solidity, 4 Rust, 2 Security

========================================
FORMAT - FOLLOW EXACTLY
========================================

DO NOT include section headers like "PART 1" or "CONCEPTUAL QUESTIONS". Start directly with Question 1.

Question 1: [Conceptual question about project/implementation]
Answer:
[MINIMUM 4 lines with **bold** keywords for technical terms, formulas, metrics. 4-5 complete sentences with technical depth.]

Question 2: [Conceptual question]
Answer:
[MINIMUM 4 lines with **bold** keywords. 4-5 complete sentences with technical depth.]

[Questions 3-10 follow same short format]

Question 11: [Coding question in primary skill]
Answer:
[2-3 sentences with **bold** keywords: problem, approach, complexity]

\`\`\`language
# Complete executable code (15-25 lines)
# Include imports, error handling, comments
# Production-ready with edge cases
\`\`\`

[3-4 sentences with **bold** keywords: how code works, key details, performance, real-world use]

[Questions 12-20 follow same format, distributed by role weightage]

========================================
CRITICAL RULES
========================================
❌ NO section headers like "--- PART 1: CONCEPTUAL QUESTIONS (1-10) ---"
❌ NO separators or dividers between questions
✅ Start IMMEDIATELY with "Question 1: ..."
✅ Use **bold** for technical terms, formulas, metrics, tools
✅ Conceptual answers: MINIMUM 4 lines (4-5 sentences with **bold**)
✅ EXACTLY 20 questions numbered sequentially from 1 to 20

========================================
CHECKLIST
========================================
☐ EXACTLY 20 questions numbered 1-20?
☐ NO section headers or separator lines?
☐ Questions 1-10 conceptual (minimum 4 lines with **bold**)?
☐ Questions 11-20 coding (role weightage distribution)?
☐ Every answer uses **bold** for technical keywords?

NOW GENERATE ALL 20 QUESTIONS STARTING WITH "Question 1:":`;

        let questions = null;
        let lastError = null;

        // Set timeout for comprehensive 20 question generation (2 minutes for detailed responses)
        const REQUEST_TIMEOUT = 120000; // 120 seconds = 2 minutes

        // Parse Perplexity API keys
        let perplexityKeys = [];
        if (process.env.PERPLEXITY_API_KEY) {
            try {
                const parsed = JSON.parse(process.env.PERPLEXITY_API_KEY);
                perplexityKeys = Array.isArray(parsed) ? parsed : [process.env.PERPLEXITY_API_KEY];
            } catch (e) {
                perplexityKeys = [process.env.PERPLEXITY_API_KEY];
            }
        }

        // PHASE 1: Try Perplexity keys first
        if (perplexityKeys.length > 0) {
            console.log('🔵 PHASE 1: Trying Perplexity API\n');

            for (let i = 0; i < perplexityKeys.length; i++) {
                const currentKey = perplexityKeys[i].trim();
                const maskedKey = currentKey.substring(0, 8) + '...' + currentKey.substring(currentKey.length - 4);
                console.log(`🔑 [PERPLEXITY ${i + 1}/${perplexityKeys.length}] Trying: ${maskedKey}`);

                const attemptStart = Date.now();

                try {
                    const response = await fetchWithTimeout(
                        'https://api.perplexity.ai/chat/completions',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${currentKey}`
                            },
                            body: JSON.stringify({
                                model: 'sonar',
                                messages: [{
                                    role: 'user',
                                    content: prompt
                                }],
                                temperature: 0.7,
                                max_tokens: 12000 // Increased for 20 comprehensive questions with code
                            })
                        },
                        REQUEST_TIMEOUT
                    );

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `HTTP ${response.status}`);
                    }

                    const data = await response.json();
                    questions = data.choices?.[0]?.message?.content;

                    if (questions && questions.length > 100) {
                        const totalTime = Date.now() - startTime;
                        console.log(`✅ [PERPLEXITY ${i + 1}/${perplexityKeys.length}] SUCCESS! (${Date.now() - attemptStart}ms)`);
                        console.log(`⏱️  Total execution time: ${totalTime}ms`);

                        return {
                            statusCode: 200,
                            headers,
                            body: JSON.stringify({
                                success: true,
                                questions: questions,
                                provider: 'perplexity',
                                model: 'llama-3.1-sonar-small-128k-online',
                                executionTime: totalTime
                            })
                        };
                    }
                } catch (error) {
                    lastError = error;
                    const attemptTime = Date.now() - attemptStart;
                    console.error(`❌ [PERPLEXITY ${i + 1}/${perplexityKeys.length}] FAILED: ${error.message} (${attemptTime}ms)`);

                    if (i < perplexityKeys.length - 1) {
                        console.log(`   ⏭️  Trying next Perplexity key...\n`);
                    }
                }
            }

            console.log('❌ All Perplexity keys failed. Falling back to Groq...\n');
        }

        // PHASE 2: Fallback to Groq (FREE & FAST)
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (GROQ_API_KEY) {
            console.log('⚡ PHASE 2: Using Groq API (Fallback)\n');

            try {
                const attemptStart = Date.now();

                const response = await fetchWithTimeout(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${GROQ_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: 'llama-3.3-70b-versatile',
                            messages: [{
                                role: 'user',
                                content: prompt
                            }],
                            temperature: 0.7,
                            max_tokens: 12000 // Increased for 20 comprehensive questions with code
                        })
                    },
                    REQUEST_TIMEOUT
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
                }

                const data = await response.json();
                questions = data.choices?.[0]?.message?.content;

                if (questions && questions.length > 100) {
                    const totalTime = Date.now() - startTime;
                    console.log(`✅ Groq SUCCESS! (${Date.now() - attemptStart}ms)`);
                    console.log(`⏱️  Total execution time: ${totalTime}ms`);

                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            questions: questions,
                            provider: 'groq',
                            model: 'llama-3.3-70b',
                            executionTime: totalTime
                        })
                    };
                }
            } catch (error) {
                lastError = error;
                console.error(`❌ Groq FAILED: ${error.message}`);
            }
        }

        // All providers failed
        console.log('❌ All providers failed\n');

        // If all providers failed, return error
        const totalTime = Date.now() - startTime;
        console.error(`❌ All providers failed. Error:`, lastError?.message);
        console.log(`⏱️  Total execution time: ${totalTime}ms`);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to generate questions',
                message: lastError?.message || 'Failed to generate interview questions',
                hint: 'Set PERPLEXITY_API_KEY or GROQ_API_KEY environment variable in Netlify'
            })
        };

    } catch (error) {
        console.error('❌ Unexpected error in generate-interview-questions:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                requiresKey: false
            })
        };
    }
};