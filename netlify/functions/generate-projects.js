// Netlify Function for generating project suggestions with multi-provider support
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
        const { jobDescription, companyName, jobTitle, apiKey, apiType } = JSON.parse(event.body || '{}');

        if (!jobDescription) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Job description is required' })
            };
        }

        console.log('🤖 Generating project suggestions for:', companyName, '-', jobTitle);

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

        const prompt = `You are a senior technical recruiter and career advisor. Based on the following job description for ${jobTitle} at ${companyName}, generate EXACTLY 5 innovative, industry-relevant project ideas that would be impressive for a portfolio.

========================================
STRICT FORMATTING REQUIREMENTS - MUST FOLLOW EXACTLY
========================================

Generate EXACTLY 5 PROJECTS. No more, no less.

For EACH project, follow this EXACT format structure:

1. Project Title: [Full descriptive project name]
Project Description: [Line 1 - What the project does and its core purpose]
[Line 2 - Key features and functionality]
[Line 3 - Technical implementation approach and architecture]
[Line 4 - Innovation or unique selling point]
[Line 5 - Real-world impact and value delivered]
Key Technologies/Skills Used: [Complete end-to-end tech stack from requirement gathering to deployment - include: Business Analysis Tools (Jira, Confluence, Figma), Frontend Technologies, Backend Technologies, Databases, APIs, Testing Tools (Jest, Pytest, Selenium), CI/CD Tools (GitHub Actions, Jenkins), Cloud/Deployment Platforms (AWS, Azure, Docker, Kubernetes), Monitoring Tools (Prometheus, Grafana), and any other role-specific skills]
Why it's impressive for this role: [Line 1 - Direct alignment with job requirements and how it demonstrates must-have skills from the job description]
[Line 2 - Business value and ROI perspective - explain the commercial impact and market relevance]
[Line 3 - Industry trends and job market demand - why this skill set is highly sought after currently]
[Line 4 - Competitive advantage for the candidate - what makes this project stand out to hiring managers and technical interviewers]

2. Project Title: [Full descriptive project name]
Project Description: [Line 1 - What the project does and its core purpose]
[Line 2 - Key features and functionality]
[Line 3 - Technical implementation approach and architecture]
[Line 4 - Innovation or unique selling point]
[Line 5 - Real-world impact and value delivered]
Key Technologies/Skills Used: [Complete end-to-end tech stack from requirement gathering to deployment - include: Business Analysis Tools (Jira, Confluence, Figma), Frontend Technologies, Backend Technologies, Databases, APIs, Testing Tools (Jest, Pytest, Selenium), CI/CD Tools (GitHub Actions, Jenkins), Cloud/Deployment Platforms (AWS, Azure, Docker, Kubernetes), Monitoring Tools (Prometheus, Grafana), and any other role-specific skills]
Why it's impressive for this role: [Line 1 - Direct alignment with job requirements and how it demonstrates must-have skills from the job description]
[Line 2 - Business value and ROI perspective - explain the commercial impact and market relevance]
[Line 3 - Industry trends and job market demand - why this skill set is highly sought after currently]
[Line 4 - Competitive advantage for the candidate - what makes this project stand out to hiring managers and technical interviewers]

[Continue this pattern for projects 3, 4, and 5]

========================================
CRITICAL ENFORCEMENT RULES - VIOLATION WILL CAUSE REJECTION
========================================

1. TOTAL PROJECTS: Generate EXACTLY 5 projects. Not 3, not 4, not 6. EXACTLY 5.

2. PROJECT DESCRIPTION LINE COUNT:
   - MUST be EXACTLY 5 lines (5 separate sentences)
   - Count: Line 1, Line 2, Line 3, Line 4, Line 5
   - Each line = ONE complete sentence ending with a period
   - NO bullet points, NO dashes, NO asterisks
   - Start counting AFTER "Project Description:" label
   - STOP at EXACTLY 5 lines before "Key Technologies/Skills Used:"

3. KEY TECHNOLOGIES/SKILLS USED:
   - MUST include COMPLETE end-to-end lifecycle tools
   - Start with: Requirement gathering (Jira, Confluence, Miro, Figma, Draw.io)
   - Include: Development (programming languages, frameworks, libraries)
   - Include: Testing (unit testing, integration testing, E2E testing tools)
   - Include: Version Control (Git, GitHub, GitLab)
   - Include: CI/CD (GitHub Actions, Jenkins, CircleCI, Travis CI)
   - Include: Deployment (Docker, Kubernetes, AWS, Azure, GCP, Vercel, Netlify)
   - Include: Monitoring (Prometheus, Grafana, Datadog, New Relic, Sentry)
   - Include: Security tools if relevant (OWASP, penetration testing tools)
   - List 15-25 specific technologies showing full project lifecycle mastery

4. WHY IT'S IMPRESSIVE LINE COUNT:
   - MUST be EXACTLY 4 lines (4 separate sentences)
   - Count: Line 1, Line 2, Line 3, Line 4
   - Each line = ONE complete sentence ending with a period
   - Start counting AFTER "Why it's impressive for this role:" label
   - Line 1: Job description alignment
   - Line 2: Business value and ROI impact
   - Line 3: Industry trends and job market demand
   - Line 4: Competitive advantage for candidate
   - STOP at EXACTLY 4 lines

5. FORMATTING RULES:
   - NO markdown formatting (**, *, __, etc.)
   - NO bullet points or special characters
   - Use plain text only
   - Separate each project with ONE blank line
   - Project numbering: "1. Project Title:", "2. Project Title:", etc.
   - Label format EXACTLY as: "Project Description:", "Key Technologies/Skills Used:", "Why it's impressive for this role:"

6. BUSINESS & MARKET DEPTH REQUIREMENTS:
   - "Why it's impressive" Line 2 MUST discuss: revenue impact, cost savings, efficiency gains, market positioning, or customer acquisition
   - "Why it's impressive" Line 3 MUST discuss: current industry trends, hiring demand statistics, or emerging technologies in the job market
   - Use specific business metrics (ROI, conversion rates, user growth, time savings)
   - Reference real industry challenges and how the project addresses them

7. LINE COUNTING VERIFICATION:
   - Before generating, mentally count: "1, 2, 3, 4, 5" for Project Description
   - Before generating, mentally count: "1, 2, 3, 4" for Why it's impressive
   - If you write 6 lines for description, YOU FAILED
   - If you write 3 lines for why impressive, YOU FAILED
   - Recount after writing each section

========================================
EXAMPLE STRUCTURE (Follow this pattern exactly):
========================================

1. Project Title: AI-Powered Customer Support Analytics Platform
Project Description: This platform analyzes customer support conversations across multiple channels to identify pain points and improve service quality.
It features real-time sentiment analysis, automated ticket categorization, and predictive escalation detection.
The system uses microservices architecture with React frontend, Node.js backend, and machine learning models for natural language processing.
The innovation lies in integrating multi-channel data (email, chat, phone transcripts) into a unified analytics dashboard with actionable insights.
Companies using this system have reduced average resolution time by 35% and improved customer satisfaction scores by 28%.
Key Technologies/Skills Used: Requirement Gathering (Jira, Confluence, Figma for wireframes), Frontend (React, TypeScript, Redux, Material-UI, Chart.js), Backend (Node.js, Express, Python for ML models), Database (PostgreSQL, Redis for caching, Elasticsearch for search), APIs (REST, GraphQL, WebSocket for real-time updates), ML/AI (TensorFlow, scikit-learn, NLTK, spaCy), Testing (Jest, React Testing Library, Pytest, Selenium), Version Control (Git, GitHub), CI/CD (GitHub Actions, Docker Compose), Deployment (AWS EC2, S3, RDS, Docker, Kubernetes), Monitoring (Prometheus, Grafana, CloudWatch, Sentry for error tracking), Security (OAuth 2.0, JWT, encryption), Documentation (Swagger, JSDoc)
Why it's impressive for this role: This project directly demonstrates full-stack development, microservices architecture, and AI/ML integration which are core requirements mentioned in the job description for this ${jobTitle} position.
From a business perspective, this showcases ability to deliver measurable ROI through data-driven solutions that reduce operational costs and improve customer retention metrics that executives care about.
The combination of NLP and real-time analytics is currently one of the hottest skill sets in the job market with 67% year-over-year growth in demand according to 2024 tech hiring reports.
During technical interviews, this project provides talking points about scalability challenges, ML model deployment, and end-to-end system design that immediately signal senior-level engineering competence.

[Then continue with projects 2, 3, 4, and 5 following the exact same structure]

========================================
JOB DESCRIPTION TO ANALYZE:
========================================

${jobDescription}

========================================
FINAL CHECKLIST BEFORE RESPONDING:
========================================
☐ Did I generate EXACTLY 5 projects?
☐ Does EACH Project Description have EXACTLY 5 lines?
☐ Does EACH "Why it's impressive" have EXACTLY 4 lines?
☐ Did I include 15-25 technologies covering the FULL lifecycle (requirement → deployment → monitoring)?
☐ Did I explain business value with specific metrics in Line 2 of "Why impressive"?
☐ Did I reference job market trends in Line 3 of "Why impressive"?
☐ Is my formatting clean with NO markdown symbols?
☐ Did I separate projects with a blank line?

Now generate the 5 projects following ALL rules above:`;

        let suggestions = null;
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
                            temperature: 0.9,
                            max_tokens: 8000 // Increased for 5 comprehensive projects with full tech stacks
                        }),
                        timeout: 90000 // 90 seconds = 1.5 minutes for detailed project generation
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `HTTP ${response.status}`);
                    }

                    const data = await response.json();
                    suggestions = data.choices?.[0]?.message?.content;

                    if (suggestions) {
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
        if (!suggestions && geminiKeys.length > 0) {
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
                                temperature: 0.9,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 8000, // Increased for 5 comprehensive projects with full tech stacks
                            }
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
                    }

                    const data = await response.json();
                    suggestions = data.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (suggestions) {
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
        if (!suggestions && huggingfaceKeys.length > 0) {
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
                                        max_new_tokens: 8000, // Increased for 5 comprehensive projects with full tech stacks
                                        temperature: 0.9,
                                        top_p: 0.95,
                                        do_sample: true
                                    }
                                }),
                                timeout: 90000 // 90 seconds = 1.5 minutes for detailed project generation
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
                            suggestions = generatedText;
                            usedProvider = 'huggingface';
                            console.log(`✅ [HUGGINGFACE ${i + 1}/${huggingfaceKeys.length}] SUCCESS!`);
                            break;
                        }
                    } catch (error) {
                        lastError = error;
                        console.error(`❌ [HUGGINGFACE ${i + 1}/${huggingfaceKeys.length}] FAILED - ${model.name}: ${error.message}`);
                    }
                }

                // Break outer loop if we got suggestions
                if (suggestions) break;
            }
        }

        // If we got suggestions, return them
        if (suggestions) {
            console.log(`✅ Project suggestions generated successfully using ${usedProvider}`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    suggestions: suggestions,
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
                message: lastError?.message || 'Failed to generate project suggestions',
                requiresKey: true
            })
        };

    } catch (error) {
        console.error('❌ Unexpected error in generate-projects:', error);
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
