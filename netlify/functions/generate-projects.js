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

        const prompt = `Based on the following job description for ${jobTitle} at ${companyName}, generate 3-5 innovative project ideas that would be impressive for a portfolio and demonstrate the required skills.

For each project, use EXACTLY this format:

1. Project Title: [Full project name here]
Project Description: [EXACTLY 5 lines describing what this project does, its purpose, key features, technical implementation, and impact. Each line should be a complete sentence. Do not use fewer or more than 5 lines.]
Key Technologies/Skills Used: [List of technologies]
Why it's impressive for this role: [EXACTLY 4 lines explaining the relevance to the role, how it demonstrates required skills, what makes it stand out, and its value to the employer. Each line should be a complete sentence. Do not use fewer or more than 4 lines.]

2. Project Title: [Full project name here]
Project Description: [EXACTLY 5 lines describing what this project does, its purpose, key features, technical implementation, and impact. Each line should be a complete sentence. Do not use fewer or more than 5 lines.]
Key Technologies/Skills Used: [List of technologies]
Why it's impressive for this role: [EXACTLY 4 lines explaining the relevance to the role, how it demonstrates required skills, what makes it stand out, and its value to the employer. Each line should be a complete sentence. Do not use fewer or more than 4 lines.]

CRITICAL REQUIREMENTS: 
- Start each project with the number and "Project Title:" on one line
- The FIRST line after the title MUST be "Project Description:"
- Project Description MUST be EXACTLY 5 complete sentences (5 lines)
- Then "Key Technologies/Skills Used:"
- Then "Why it's impressive for this role:"
- "Why it's impressive for this role" MUST be EXACTLY 4 complete sentences (4 lines)
- Separate each project with a blank line
- Do NOT use asterisks, markdown, or special formatting
- COUNT the lines carefully - 5 for description, 4 for why impressive

Job Description:
${jobDescription}`;

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
                            max_tokens: 2048
                        }),
                        timeout: 60000
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
                                maxOutputTokens: 2048,
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
                                        max_new_tokens: 2048,
                                        temperature: 0.9,
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
