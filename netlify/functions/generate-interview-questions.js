// Netlify Function for generating interview questions with multi-provider support
// Supports: Perplexity → Gemini → HuggingFace (in that order)
// Uses native fetch API available in Netlify Functions (Node.js 18+)

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
        const { resumeText, jobDescription, companyName, jobTitle, apiKey, apiType } = JSON.parse(event.body || '{}');

        if (!resumeText || !jobDescription) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Resume text and job description are required' })
            };
        }

        console.log('🤖 Generating interview questions for:', companyName, '-', jobTitle);

        // Parse API keys from environment
        let perplexityKeys = [];
        let geminiKeys = [];
        let huggingfaceKeys = [];

        // If user provided custom keys, use them
        if (apiKey && apiType) {
            if (apiType === 'perplexity') {
                perplexityKeys = [apiKey];
            } else if (apiType === 'gemini') {
                geminiKeys = [apiKey];
            } else if (apiType === 'huggingface') {
                huggingfaceKeys = [apiKey];
            }
        } else {
            // Load Perplexity keys
            if (process.env.PERPLEXITY_API_KEY) {
                try {
                    const parsed = JSON.parse(process.env.PERPLEXITY_API_KEY);
                    perplexityKeys = Array.isArray(parsed) ? parsed : [process.env.PERPLEXITY_API_KEY];
                } catch (e) {
                    perplexityKeys = [process.env.PERPLEXITY_API_KEY];
                }
            }

            // Load Gemini keys
            if (process.env.GEMINI_API_KEY) {
                try {
                    const parsed = JSON.parse(process.env.GEMINI_API_KEY);
                    geminiKeys = Array.isArray(parsed) ? parsed : [process.env.GEMINI_API_KEY];
                } catch (e) {
                    geminiKeys = [process.env.GEMINI_API_KEY];
                }
            }

            // Load HuggingFace keys
            if (process.env.HUGGINGFACE_API_KEY) {
                try {
                    const parsed = JSON.parse(process.env.HUGGINGFACE_API_KEY);
                    huggingfaceKeys = Array.isArray(parsed) ? parsed : [process.env.HUGGINGFACE_API_KEY];
                } catch (e) {
                    huggingfaceKeys = [process.env.HUGGINGFACE_API_KEY];
                }
            }
        }

        if (perplexityKeys.length === 0 && geminiKeys.length === 0 && huggingfaceKeys.length === 0) {
            console.error('❌ No API keys found');
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: 'API keys not configured',
                    requiresKey: true
                })
            };
        }

        console.log(`📋 Found ${perplexityKeys.length} Perplexity key(s), ${geminiKeys.length} Gemini key(s), and ${huggingfaceKeys.length} HuggingFace key(s)`);

        const prompt = `You are an expert technical interviewer with deep industry experience. Generate EXACTLY 20 highly relevant interview questions with comprehensive answers based on the candidate's resume and the job description.

**Candidate's Resume:**
${resumeText}

**Job Description for ${jobTitle} at ${companyName}:**
${jobDescription}

**QUESTION DISTRIBUTION REQUIREMENTS:**
- Generate EXACTLY 20 questions total
- 10 questions (50%) MUST be CONCEPTUAL based on real-time experience, projects, and scenarios
- 10 questions (50%) MUST be CODING questions with detailed explanations and complete code examples
- ALL questions must be directly relevant to skills mentioned in the resume and job description
- Match questions to the role's primary programming languages and technologies

**ROLE-SPECIFIC LANGUAGE GUIDELINES:**
Tailor questions based on the job role and use appropriate languages from this reference:

🖥️ SOFTWARE & DATA ROLES:
• Full Stack Engineer: JavaScript/TypeScript, Python/Java, SQL
• Backend Developer: Java, Python, Go
• Frontend Developer: JavaScript, TypeScript, HTML/CSS
• Data Analyst: SQL, Python, R
• Data Engineer: Python, SQL, Scala
• Data Scientist: Python, R, SQL
• Machine Learning Engineer: Python, C++, Java
• AI/LLM Engineer: Python, C++, Rust
• Cloud Engineer: Python, Go, Java
• DevOps Engineer: Python, Go, Bash
• MLOps Engineer: Python, Go, Shell
• Cybersecurity Engineer: Python, C, PowerShell
• Mobile App Developer: Kotlin, Swift, Dart
• Game Developer: C#, C++, Python
• Blockchain Developer: Solidity, Rust, Go

⚙️ HARDWARE/SEMICONDUCTOR/VLSI ROLES:
• RTL Design Engineer: SystemVerilog, Verilog, TCL/Python
• VLSI Design Engineer: Verilog/SystemVerilog, VHDL, Python/Perl
• Design Verification Engineer: SystemVerilog (UVM), Verilog, Python/Perl
• ASIC Verification Engineer: SystemVerilog + UVM, Verilog, Python/C++
• FPGA Prototyping Engineer: VHDL, Verilog, TCL/Python
• Physical Design Engineer: TCL, Python, Perl
• DFT Engineer: SystemVerilog, TCL, Python
• CAD/EDA Tools Engineer: Python, Perl, TCL
• Embedded Systems Engineer: C, C++, Assembly
• Firmware Engineer: C, C++, Python
• Semiconductor Test Engineer: C, Python, VBScript/LabVIEW
• Mixed-Signal Design Engineer: Verilog-A/Verilog-AMS, SystemVerilog, MATLAB
• Analog Layout Engineer: SKILL (Cadence), Python, TCL
• DSP Engineer: C, C++, MATLAB
• SOC Architect/SOC Design Engineer: SystemVerilog, C++, Python

**FORMAT FOR CONCEPTUAL QUESTIONS (50% - 10 Questions):**

Question [Number]: [Specific scenario-based or experience-based question related to real projects]
Answer:
[Paragraph 1: 5-6 lines covering the core concept, approach, methodology, and real-world considerations. Discuss how this applies in production environments, team scenarios, or actual project implementations.]

[Paragraph 2: 5-6 lines providing specific examples, best practices, trade-offs, challenges faced in real scenarios, and how experienced professionals handle this situation. Include metrics, tools, or frameworks where relevant.]

**FORMAT FOR CODING QUESTIONS (50% - 10 Questions):**

Question [Number]: [Specific coding problem or implementation challenge]
Answer:
[5-6 lines of explanation covering the problem, approach, algorithm/data structure choice, time/space complexity, and why this solution is optimal]

\`\`\`[language]
[Complete, production-ready, well-commented code that actually runs]
[Include proper error handling, edge cases, and best practices]
[Code should be 15-20 lines minimum for meaningful implementation]
\`\`\`

[5-6 lines explaining how the code works, key implementation details, and what makes this solution effective]

[5-6 lines covering real-world applications, performance considerations, alternative approaches, or common pitfalls to avoid]

**CRITICAL REQUIREMENTS FOR ALL 20 QUESTIONS:**
✅ Questions 1-10: Conceptual/Experience-based (10-12 lines each, 2 paragraphs)
✅ Questions 11-20: Coding questions (5-6 lines explanation + complete code + 5-6 lines details + 5-6 lines real-world context)
✅ Every coding question MUST include working code in triple backticks with language specification
✅ Code must be complete, executable, and production-quality (15-20 lines minimum)
✅ Match programming languages to the job role and resume
✅ Focus on technologies and skills explicitly mentioned in the job description
✅ Avoid generic questions - make them specific to the candidate's background
✅ Include proper error handling, edge cases, and comments in code
✅ For hardware/VLSI roles: Include SystemVerilog/Verilog/VHDL as appropriate
✅ For data roles: Include SQL queries with JOINs, aggregations, and optimizations
✅ For backend roles: Include API design, database interactions, and system design
✅ For frontend roles: Include React/Vue/Angular components with state management

Generate all 20 questions NOW following this EXACT format. Make answers comprehensive, practical, and directly relevant to the candidate's experience and the job requirements.`;

        let questions = null;
        let usedProvider = null;
        let lastError = null;

        // ============================================
        // PHASE 1: TRY ALL PERPLEXITY KEYS
        // ============================================
        if (perplexityKeys.length > 0) {
            console.log('\n🔵 PHASE 1: Trying Perplexity API Keys\n');

            for (let i = 0; i < perplexityKeys.length; i++) {
                const currentKey = perplexityKeys[i].trim();
                const maskedKey = currentKey.substring(0, 8) + '...' + currentKey.substring(currentKey.length - 4);
                console.log(`🔑 [PERPLEXITY ${i + 1}/${perplexityKeys.length}] Trying: ${maskedKey}`);

                try {
                    const response = await fetch('https://api.perplexity.ai/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentKey}`
                        },
                        body: JSON.stringify({
                            model: 'sonar',
                            messages: [
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            temperature: 0.7,
                            max_tokens: 9072
                        }),
                        timeout: 120000
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `HTTP ${response.status}`);
                    }

                    const data = await response.json();
                    questions = data.choices?.[0]?.message?.content;

                    if (questions) {
                        usedProvider = 'perplexity';
                        console.log(`✅ [PERPLEXITY ${i + 1}/${perplexityKeys.length}] SUCCESS!`);
                        break;
                    }
                } catch (error) {
                    lastError = error;
                    console.error(`❌ [PERPLEXITY ${i + 1}/${perplexityKeys.length}] FAILED: ${error.message}`);
                    if (i < perplexityKeys.length - 1) {
                        console.log(`   ⏭️  Trying next Perplexity key...\n`);
                    }
                }
            }
        }

        // ============================================
        // PHASE 2: IF PERPLEXITY FAILED, TRY GEMINI
        // ============================================
        if (!questions && geminiKeys.length > 0) {
            console.log('🟢 PHASE 2: Switching to Gemini API Keys\n');
            const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

            for (let i = 0; i < geminiKeys.length; i++) {
                const currentKey = geminiKeys[i].trim();
                const maskedKey = currentKey.substring(0, 8) + '...' + currentKey.substring(currentKey.length - 4);
                console.log(`🔑 [GEMINI ${i + 1}/${geminiKeys.length}] Trying: ${maskedKey}`);

                try {
                    const response = await fetch(`${GEMINI_API_URL}?key=${currentKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: prompt
                                }]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 9072,
                            }
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
                    }

                    const data = await response.json();
                    questions = data.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (questions) {
                        usedProvider = 'gemini';
                        console.log(`✅ [GEMINI ${i + 1}/${geminiKeys.length}] SUCCESS!`);
                        break;
                    }
                } catch (error) {
                    lastError = error;
                    console.error(`❌ [GEMINI ${i + 1}/${geminiKeys.length}] FAILED: ${error.message}`);
                    if (i < geminiKeys.length - 1) {
                        console.log(`   ⏭️  Trying next Gemini key...\n`);
                    }
                }
            }
        }

        // ============================================
        // PHASE 3: IF GEMINI FAILED, TRY HUGGINGFACE
        // ============================================
        if (!questions && huggingfaceKeys.length > 0) {
            console.log('🟡 PHASE 3: Switching to HuggingFace API Keys\n');

            const huggingfaceModels = [
                { name: "Qwen 2.5", id: "Qwen/Qwen2.5-72B-Instruct" },
                { name: "Llama 3.1", id: "meta-llama/Llama-3.1-70B-Instruct" }
            ];

            for (let i = 0; i < huggingfaceKeys.length; i++) {
                const currentKey = huggingfaceKeys[i].trim();
                const maskedKey = currentKey.substring(0, 5) + '...' + currentKey.substring(currentKey.length - 4);

                for (const model of huggingfaceModels) {
                    console.log(`🔑 [HUGGINGFACE ${i + 1}/${huggingfaceKeys.length}] Key: ${maskedKey} | Model: ${model.name}`);

                    try {
                        const response = await fetch(
                            `https://api-inference.huggingface.co/models/${model.id}`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${currentKey}`
                                },
                                body: JSON.stringify({
                                    inputs: prompt,
                                    parameters: {
                                        max_new_tokens: 9072,
                                        temperature: 0.7,
                                        top_p: 0.95,
                                        do_sample: true
                                    }
                                }),
                                timeout: 60000
                            }
                        );

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            throw new Error(errorData.error || `HTTP ${response.status}`);
                        }

                        const data = await response.json();
                        let generatedText = null;

                        if (Array.isArray(data)) {
                            generatedText = data[0]?.generated_text;
                        } else if (data.generated_text) {
                            generatedText = data.generated_text;
                        } else if (typeof data === 'string') {
                            generatedText = data;
                        }

                        // Remove the prompt from the response if it's included
                        if (generatedText && generatedText.includes(prompt)) {
                            generatedText = generatedText.replace(prompt, '').trim();
                        }

                        if (generatedText && generatedText.length > 100) {
                            questions = generatedText;
                            usedProvider = 'huggingface';
                            console.log(`✅ [HUGGINGFACE ${i + 1}/${huggingfaceKeys.length}] SUCCESS!`);
                            break;
                        }
                    } catch (error) {
                        lastError = error;
                        console.error(`❌ [HUGGINGFACE ${i + 1}/${huggingfaceKeys.length}] FAILED - ${model.name}: ${error.message}`);
                    }
                }

                // Break outer loop if we got questions
                if (questions) break;
            }
        }

        // If we got questions, return them
        if (questions) {
            console.log(`✅ Interview questions generated successfully using ${usedProvider}`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    questions: questions,
                    provider: usedProvider
                })
            };
        }

        // All keys failed - return error and ask for custom key
        console.error(`❌ All API keys failed. Last error:`, lastError?.message);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'All API keys exhausted. Please provide your own API key.',
                message: lastError?.message || 'Failed to generate interview questions',
                requiresKey: true
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
