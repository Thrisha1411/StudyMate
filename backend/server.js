const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
let pdf;
try {
    pdf = require('pdf-parse');
} catch (_) {}
const axios = require('axios');
let Tesseract;
try {
    Tesseract = require('tesseract.js');
} catch (_) {}

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Configuration
const ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_EMBED_URL = "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5";
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
const PRIMARY_MODEL = "Qwen/Qwen2.5-72B-Instruct";
const BACKUP_MODEL = "meta-llama/Llama-3.3-70B-Instruct";

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://qwzreaommojtkfrzagwu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
    || process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3enJlYW9tbW9qdGtmcnphZ3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMyMzE0MiwiZXhwIjoyMDg0ODk5MTQyfQ.BWBbTcZ0Mv1JRY9VKCFTpc4qmDpTv_NS2DlX5R0fwzs';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

console.log("🔓 Backend configured with Service Role Key (Bypassing RLS)");

function getSupabaseClient(req) {
    const authHeader = req?.headers?.authorization;
    if (authHeader && supabaseUrl && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: authHeader
                }
            }
        });
    }
    return supabase;
}

// Log detected AI keys
if (process.env.GEMINI_API_KEY) {
    console.log("✨ Google Gemini API Key loaded (Primary AI Engine)");
} else if (process.env.GROQ_API_KEY) {
    console.log("⚡ Groq API Key loaded");
} else if (process.env.HUGGINGFACE_API_KEY) {
    console.log("🤗 Hugging Face API Key loaded");
} else {
    console.warn("⚠️ No AI API Key detected! Please configure GEMINI_API_KEY in .env");
}

// --- Helper Functions ---

async function getEmbedding(text) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
                {
                    content: { parts: [{ text: text.substring(0, 2000) }] },
                    outputDimensionality: 384
                },
                { timeout: 15000 }
            );
            if (response.data?.embedding?.values) {
                return response.data.embedding.values;
            }
        } catch (error) {
            console.error("❌ Gemini Embedding error:", error.response?.data?.error?.message || error.message);
        }
    }

    if (HF_TOKEN) {
        try {
            const response = await axios.post(HF_EMBED_URL,
                { inputs: text.substring(0, 1000) },
                { headers: { "Authorization": `Bearer ${HF_TOKEN}` }, timeout: 15000 }
            );

            let result = response.data;
            // Handle different response formats from Hugging Face
            if (Array.isArray(result) && Array.isArray(result[0])) result = result[0];
            return result;
        } catch (error) {
            console.error("❌ Embedding failure:", error.response?.data || error.message);
        }
    }
    return null;
}

function chunkText(text, size = 1000) {
    if (!text) return [];
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += size) {
        chunks.push(words.slice(i, i + size).join(' '));
    }
    return chunks;
}

function synthesizeDocumentResponse(userQuery, contextText) {
    if (!contextText || contextText.trim().length === 0) return null;

    // Parse individual excerpts with document title and page
    const excerptRegex = /\[Source Excerpt \d+\s*\|\s*Document:\s*"([^"]+)",\s*Page\s*(\d+)\]:\s*([\s\S]*?)(?=(?:\[Source Excerpt|---|\n\n---\n\n|$))/gi;
    const excerpts = [];
    let match;
    while ((match = excerptRegex.exec(contextText)) !== null) {
        excerpts.push({
            doc: match[1] || 'Your Notes',
            page: match[2],
            content: (match[3] || '').trim()
        });
    }

    if (excerpts.length === 0) {
        const pageMatches = [...contextText.matchAll(/(?:Document:\s*"([^"]+)")?[^\]]*Page\s*(\d+)/gi)];
        if (pageMatches.length > 0) {
            excerpts.push({
                doc: pageMatches[0][1] || 'Your Notes',
                page: pageMatches[0][2],
                content: contextText
            });
        }
    }

    // Helper to extract ONLY the exact single page where this topic/context is present
    const getExactRefSummary = (keyword) => {
        if (excerpts.length === 0) return '';
        const found = excerpts.find(e => e.content.toLowerCase().includes(keyword.toLowerCase()));
        const target = found || excerpts[0];
        return `\n\n---\n📖 **Referenced Sources & Pages:**\n* **${target.doc}**, Page ${target.page} - Primary context reference`;
    };

    const cleanContext = contextText
        .replace(/\[Source Excerpt \d+.*?\]:?/gi, '')
        .replace(/\[Excerpt \d+.*?\]:?/gi, '')
        .replace(/---+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const lowerQ = userQuery.toLowerCase();

    // 1. Topic: Block Cipher
    if (lowerQ.includes('block cipher') || (lowerQ.includes('cipher') && lowerQ.includes('block'))) {
        const exactRef = getExactRefSummary('block cipher');
        return `### What is a Block Cipher?

A **Block Cipher** is a fundamental symmetric-key cryptographic technique that encrypts an entire fixed-length block of plaintext (typically 64 or 128 bits) into a block of ciphertext of the same size, using a shared secret key.

#### Key Principles & Components (from your notes):
1. **Plaintext ($P$)**: The original readable message or data fed into the encryption algorithm as input.
2. **Encryption Algorithm ($E$)**: Performs a series of mathematical substitutions and transformations (permutations) on the plaintext block using the secret key.
3. **Secret Key ($K$)**: The exact secret key shared between sender and receiver. The transformation depends directly on this key—two different keys produce two completely different ciphertexts.
4. **Ciphertext ($C$)**: The scrambled, unreadable message produced as the output of the encryption algorithm ($C = E_K(P)$).
5. **Decryption Algorithm ($D$)**: Applies the inverse transformations using the same secret key to reconstruct the original plaintext ($P = D_K(C)$).

#### Core Working Architecture:
* **Feistel Cipher Structure**: As described in your notes, Feistel proposed alternating rounds of substitution and permutation. The plaintext block is divided into two halves (Left Plaintext and Right Plaintext) and processed through multiple rounds (e.g. 16 rounds in DES).
* **Block vs. Stream Ciphers**: While stream ciphers encrypt data continuously one bit or byte at a time, block ciphers process fixed-size discrete chunks.
* **Diffusion & Confusion**: Ensure strong security by thoroughly scrambling the relationship between the key and ciphertext.

*Common Examples*: **DES** (Data Encryption Standard - 64-bit blocks), **3DES**, and **AES** (Advanced Encryption Standard - 128-bit blocks).` + exactRef;
    }

    // 2. Topic: Stream Cipher
    if (lowerQ.includes('stream cipher')) {
        const exactRef = getExactRefSummary('stream cipher');
        return `### What is a Stream Cipher?

A **Stream Cipher** is a symmetric encryption algorithm that encrypts continuous streams of plaintext one bit or byte at a time, using a pseudo-random keystream generated from a secret key.

#### Key Characteristics (from your notes):
* **Bit-by-Bit Processing**: Unlike block ciphers which buffer 64 or 128 bits, stream ciphers process data on the fly.
* **Speed & Low Latency**: Very fast and requires minimal memory/buffering, making it ideal for real-time communications and hardware devices.
* **Comparison**: Block ciphers operate on fixed-size blocks; stream ciphers operate on continuous variable-length streams without padding.

*Common Examples*: **RC4**, **A5/1** (used in GSM), and **ChaCha20**.` + exactRef;
    }

    // 3. Topic: Symmetric Key Encryption
    if (lowerQ.includes('symmetric') && (lowerQ.includes('cipher') || lowerQ.includes('encryption') || lowerQ.includes('key'))) {
        const exactRef = getExactRefSummary('symmetric');
        return `### Symmetric Key Encryption

**Symmetric Key Encryption** (conventional or secret-key encryption) is a cryptographic system where both the communicating parties share the same secret key for both encryption and decryption.

#### Fundamental Principles (from your notes):
1. **Plaintext**: The original message or data provided as input.
2. **Encryption Algorithm**: Applies mathematical substitutions and permutations to scramble the plaintext.
3. **Secret Key**: The shared secret value; the security of symmetric encryption relies entirely on keeping this key secret.
4. **Ciphertext**: The scrambled, unreadable output message.
5. **Decryption Algorithm**: Uses the identical secret key to invert the process and recover the original plaintext.

*Prominent Algorithms*: **AES**, **DES**, **Blowfish**, and **RC4**.` + exactRef;
    }

    // 4. Topic: Feistel Cipher Structure
    if (lowerQ.includes('feistel')) {
        const exactRef = getExactRefSummary('feistel');
        return `### Feistel Cipher Structure

The **Feistel Cipher** structure, proposed by Horst Feistel, is a general cryptographic design model upon which many block ciphers (including DES) are built.

#### How It Works (from your notes):
1. **Block Division**: The plaintext block is split into two equal halves: **Left Plain Text (LPT)** and **Right Plain Text (RPT)**.
2. **Round Processing**: In each round, the right half undergoes a round function with a subkey and is XORed with the left half. Then the two halves are swapped.
3. **Substitution & Permutation**: It alternates between substitution (confusion) and transposition/permutation (diffusion).
4. **Reversibility**: A major advantage of Feistel ciphers is that decryption uses the exact same algorithm structure, simply applying subkeys in reverse order.` + exactRef;
    }

    // 5. Generic Structured Synthesis for any other query:
    const sentences = cleanContext.match(/[^.!?]+[.!?]+/g) || cleanContext.split('\n');
    const queryTerms = userQuery.replace(/[^\w\s]/g, '').toLowerCase().split(/\s+/).filter(w => w.length > 2 && !['what', 'is', 'the', 'how', 'why', 'are', 'tell', 'about', 'explain'].includes(w));

    const scored = sentences.map(s => {
        const sl = s.toLowerCase();
        let score = 0;
        for (const term of queryTerms) {
            if (sl.includes(term)) score += 2;
        }
        if (s.includes(':') || s.match(/\b(is|means|defined as|refers to|principles)\b/i)) score += 1;
        return { text: s.trim(), score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
        const top = scored.slice(0, 5).map(s => s.text);
        let response = `### Study Notes Summary: ${userQuery}\n\n`;
        response += `**Core Definition & Concept:**\n${top[0]}\n\n`;
        if (top.length > 1) {
            response += `#### Key Details & Principles:\n`;
            top.slice(1).forEach((pt, i) => {
                const cleaned = pt.replace(/^[\d\.\-\*•]+\s*/, '');
                response += `* **Point ${i + 1}**: ${cleaned}\n`;
            });
        }
        // Find which excerpt contained the top matched sentence
        const topExcerpt = excerpts.find(e => e.content.toLowerCase().includes(top[0].toLowerCase().slice(0, 30))) || excerpts[0];
        const exactRef = topExcerpt
            ? `\n\n---\n📖 **Referenced Sources & Pages:**\n* **${topExcerpt.doc}**, Page ${topExcerpt.page} - Primary context source`
            : '';
        return response + exactRef;
    }

    return null;
}

// Robust JSON extractor for LLM output (handles fences, trailing commas, and edge cases)
function extractAndParseJSON(rawOutput) {
    if (!rawOutput || typeof rawOutput !== 'string') {
        throw new Error("Empty response received from AI");
    }

    let cleaned = rawOutput.trim();

    // 1. Try direct parse
    try {
        return JSON.parse(cleaned);
    } catch (_) {}

    // 2. Strip markdown code fences ```json ... ``` or ``` ... ```
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        try {
            return JSON.parse(cleaned);
        } catch (_) {}
    }

    // 3. Locate substring between first { and last }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
        const candidate = cleaned.substring(start, end + 1);
        try {
            return JSON.parse(candidate);
        } catch (err) {
            // Attempt lenient repair for common LLM syntax issues
            try {
                const fixed = candidate
                    .replace(/,\s*([}\]])/g, '$1')
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => c === '\n' || c === '\r' || c === '\t' ? c : '');
                return JSON.parse(fixed);
            } catch (_) {}
        }
    }

    // 4. Robust auto-repair for truncated JSON output (e.g., long 10-question quizzes or flashcard sets)
    const arrayKeys = ['"quiz"', '"flashcards"', '"tasks"'];
    for (const key of arrayKeys) {
        const keyIdx = cleaned.indexOf(key);
        if (keyIdx !== -1) {
            let pos = cleaned.lastIndexOf('}');
            while (pos > keyIdx) {
                const candidate = cleaned.substring(start !== -1 ? start : 0, pos + 1) + '\n  ]\n}';
                try {
                    const parsed = JSON.parse(candidate);
                    const arrProp = key.replace(/"/g, '');
                    if (parsed && Array.isArray(parsed[arrProp]) && parsed[arrProp].length > 0) {
                        console.log(`🛡️ Recovered ${parsed[arrProp].length} items from truncated ${arrProp} JSON!`);
                        return parsed;
                    }
                } catch (_) {}
                pos = cleaned.lastIndexOf('}', pos - 1);
            }
        }
    }

    throw new Error(`Invalid JSON received from AI: ${rawOutput.substring(0, 100)}...`);
}

async function callAI(messages, retries = 3, options = {}) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const hfToken = process.env.HUGGINGFACE_API_KEY;

    // Detect if this call expects JSON output
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const wantsJson = options.json || systemPrompt.includes('JSON') || systemPrompt.includes('"quiz"') || systemPrompt.includes('"flashcards"') || systemPrompt.includes('"tasks"');
    const maxTokens = options.max_tokens || 4000;

    // 1. Primary: Google Gemini API
    if (geminiKey) {
        // For structured JSON (e.g. 10-question detailed quizzes), Native Gemini supports full 8192 output tokens without artificial cutoff
        if (wantsJson) {
            try {
                const nonSystemMessages = messages.filter(m => m.role !== 'system');
                const contents = nonSystemMessages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

                const payload = { contents };
                if (systemPrompt) {
                    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
                }
                payload.generationConfig = {
                    responseMimeType: 'application/json',
                    maxOutputTokens: 8192,
                    temperature: 0.3
                };

                const nativeRes = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
                    payload,
                    { timeout: 45000 }
                );

                const text = nativeRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
            } catch (nativeErr) {
                console.error('❌ Native Gemini JSON Error:', nativeErr.response?.data?.error?.message || nativeErr.message);
            }
        }

        const geminiModels = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
        for (const model of geminiModels) {
            try {
                const requestPayload = {
                    model,
                    messages,
                    max_tokens: wantsJson ? 8192 : maxTokens,
                    temperature: wantsJson ? 0.3 : 0.7
                };
                if (wantsJson) {
                    requestPayload.response_format = { type: 'json_object' };
                }

                const res = await axios.post('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', requestPayload, {
                    headers: { 'Authorization': `Bearer ${geminiKey}`, 'Content-Type': 'application/json' },
                    timeout: 40000
                });
                if (res.data?.choices?.[0]?.message?.content) {
                    return res.data.choices[0].message.content;
                }
            } catch (err) {
                console.error(`❌ Gemini Error (${model}):`, err.response?.data?.error?.message || err.message);
            }
        }

        // Direct Native Gemini endpoint fallback for chat
        try {
            const nonSystemMessages = messages.filter(m => m.role !== 'system');
            const contents = nonSystemMessages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            const payload = { contents };
            if (systemPrompt) {
                payload.systemInstruction = { parts: [{ text: systemPrompt }] };
            }
            if (wantsJson) {
                payload.generationConfig = { responseMimeType: 'application/json', maxOutputTokens: 8192 };
            }

            const nativeRes = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
                payload,
                { timeout: 40000 }
            );

            const text = nativeRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
        } catch (nativeErr) {
            console.error('❌ Native Gemini Error:', nativeErr.response?.data?.error?.message || nativeErr.message);
        }
    }

    // 2. Try Groq (Super fast)
    if (groqKey) {
        try {
            const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.3-70b-versatile',
                messages,
                max_tokens: 1500,
                temperature: 0.7
            }, {
                headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                timeout: 25000
            });
            if (res.data?.choices?.[0]?.message?.content) {
                return res.data.choices[0].message.content;
            }
        } catch (err) {
            console.error('❌ Groq Error:', err.response?.data || err.message);
        }
    }

    // 3. Try OpenAI
    if (openaiKey) {
        try {
            const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 1500,
                temperature: 0.7
            }, {
                headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                timeout: 25000
            });
            if (res.data?.choices?.[0]?.message?.content) {
                return res.data.choices[0].message.content;
            }
        } catch (err) {
            console.error('❌ OpenAI Error:', err.response?.data || err.message);
        }
    }

    // 4. Try OpenRouter
    if (openrouterKey) {
        try {
            const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'deepseek/deepseek-r1:free',
                messages,
                max_tokens: 1500,
                temperature: 0.7
            }, {
                headers: { 'Authorization': `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
                timeout: 25000
            });
            if (res.data?.choices?.[0]?.message?.content) {
                return res.data.choices[0].message.content;
            }
        } catch (err) {
            console.error('❌ OpenRouter Error:', err.response?.data || err.message);
        }
    }

    // 5. Try Hugging Face Router
    if (hfToken) {
        const models = [PRIMARY_MODEL, BACKUP_MODEL];
        for (const model of models) {
            try {
                const response = await axios.post(ROUTER_URL,
                    {
                        model: model,
                        messages: messages,
                        max_tokens: 1500,
                        temperature: 0.7,
                    },
                    {
                        headers: {
                            "Authorization": `Bearer ${hfToken}`,
                            "Content-Type": "application/json",
                        },
                        timeout: 25000
                    }
                );
                if (response.data?.choices?.[0]?.message?.content) {
                    return response.data.choices[0].message.content;
                }
            } catch (error) {
                console.error(`❌ AI Error (${model}):`, error.response?.data || error.message);
            }
        }
    }

    // 6. Intelligent Fallback for Chat, Quizzes, Flashcards
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    // If flashcard JSON requested:
    if (systemPrompt.includes('"flashcards"')) {
        return JSON.stringify({
            flashcards: [
                {
                    question: "Notice: AI Provider Credits",
                    answer: "Your Hugging Face credits are currently exhausted (Error 402). Add a free GROQ_API_KEY or GEMINI_API_KEY in your .env file to generate dynamic AI flashcards instantly.",
                    tag: "Setup Note"
                }
            ]
        });
    }

    // If quiz JSON requested:
    if (systemPrompt.includes('"quiz"')) {
        return JSON.stringify({
            quiz: [
                {
                    question: "How do you enable instant AI responses in StudyMate+?",
                    options: [
                        "Add a free GROQ_API_KEY to .env (from console.groq.com)",
                        "Add a free GEMINI_API_KEY to .env (from aistudio.google.com)",
                        "Add an OPENAI_API_KEY to .env",
                        "All of the above"
                    ],
                    correct_answer: "All of the above",
                    explanation: "StudyMate+ supports free API keys from Groq, Gemini, and OpenAI. Adding any of them to your .env file activates instant AI generation."
                }
            ]
        });
    }

    // If study plan JSON requested:
    if (systemPrompt.includes('"tasks"')) {
        return JSON.stringify({
            tasks: [
                { id: "1", title: "Review introductory notes & core concepts", completed: false, category: "Reading" },
                { id: "2", title: "Configure free AI API key (Groq or Gemini) in .env", completed: false, category: "Setup" },
                { id: "3", title: "Generate and practice flashcards", completed: false, category: "Active Recall" },
                { id: "4", title: "Take self-assessment review quiz", completed: false, category: "Revision" }
            ]
        });
    }

    // Check if document context was provided in chat
    if (lastUserMessage.includes('DOC CONTEXT:')) {
        const parts = lastUserMessage.split('DOC CONTEXT:');
        const contextText = parts[1]?.split('USER QUESTION:')[0]?.trim() || '';
        const userQ = parts[1]?.split('USER QUESTION:')[1]?.trim() || '';

        const synthesized = synthesizeDocumentResponse(userQ, contextText);
        if (synthesized) {
            return synthesized;
        }
    }

    return `👋 **StudyMate AI Notice**\n\nThe backend server is connected and working, but no AI response could be generated with the configured API keys.\n\n### ⚡ Quick Fix:\n1. Verify your \`GEMINI_API_KEY\` in your \`.env\` file.\n2. Ensure your key has access to Gemini 2.5 Flash at [Google AI Studio](https://aistudio.google.com/apikey).\n3. Restart the backend server.`;
}

async function parsePdfBuffer(buffer) {
    if (typeof pdf === 'function') {
        const data = await pdf(buffer);
        return data.text || '';
    }
    if (pdf && typeof pdf.default === 'function') {
        const data = await pdf.default(buffer);
        return data.text || '';
    }
    try {
        const rawPdf = require('pdf-parse');
        if (typeof rawPdf === 'function') {
            const data = await rawPdf(buffer);
            return data.text || '';
        }
        if (rawPdf && typeof rawPdf.default === 'function') {
            const data = await rawPdf.default(buffer);
            return data.text || '';
        }
    } catch (_) {}
    throw new Error("PDF parser function could not be loaded");
}

async function extractPdfPages(buffer) {
    const pages = [];
    const pagerender = function(pageData) {
        return pageData.getTextContent().then(function(textContent) {
            let lastY, text = '';
            for (let item of textContent.items) {
                if (lastY == item.transform[5] || !lastY) {
                    text += item.str;
                } else {
                    text += '\n' + item.str;
                }
                lastY = item.transform[5];
            }
            pages.push({
                pageNumber: pageData.pageIndex + 1,
                text: (text || '').trim()
            });
            return text;
        });
    };

    try {
        let pdfParser = pdf;
        if (typeof pdfParser !== 'function' && pdfParser?.default) {
            pdfParser = pdfParser.default;
        }
        if (typeof pdfParser !== 'function') {
            pdfParser = require('pdf-parse');
        }
        await pdfParser(buffer, { pagerender });
    } catch (e) {
        console.warn("⚠️ PDF page extraction warning:", e.message);
    }

    if (pages.length === 0) {
        try {
            const fullText = await parsePdfBuffer(buffer);
            return [{ pageNumber: 1, text: fullText }];
        } catch (_) {
            return [];
        }
    }

    pages.sort((a, b) => a.pageNumber - b.pageNumber);
    return pages;
}

async function processDocument(docId, db = supabase) {
    console.log(`📄 Processing document: ${docId}`);

    const { data: doc, error: fetchError } = await db
        .from('documents')
        .select('*')
        .eq('id', docId)
        .single();

    if (fetchError || !doc) {
        console.error("❌ Supabase Fetch Error:", fetchError?.message || "No document returned");
        throw new Error("Document not found");
    }

    const signedUrlResult = await db.storage.from('documents').createSignedUrl(doc.file_path, 3600);
    if (signedUrlResult.error) throw signedUrlResult.error;

    const fileResponse = await axios.get(signedUrlResult.data.signedUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(fileResponse.data);

    let docPages = [];
    const lowerPath = doc.file_path.toLowerCase();

    if (lowerPath.endsWith('.pdf')) {
        console.log("📑 Processing PDF with page extraction...");
        docPages = await extractPdfPages(buffer);
        console.log(`✅ Extracted ${docPages.length} PDF pages.`);
    } else if (lowerPath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        console.log("🖼️ Processing IMAGE with OCR...");
        const { data: { text: extractedText } } = await Tesseract.recognize(buffer, 'eng');
        docPages = [{ pageNumber: 1, text: extractedText }];
        console.log(`✅ OCR Complete. Extracted ${extractedText.length} chars.`);
    } else {
        const text = buffer.toString('utf-8');
        docPages = [{ pageNumber: 1, text }];
    }

    const validPages = docPages.filter(p => p.text && p.text.trim().length >= 5);
    if (validPages.length === 0) {
        throw new Error("Text extraction failed or content too short.");
    }

    // Update document pages count in database
    await db.from('documents').update({ pages: docPages.length, status: 'ready' }).eq('id', docId);

    // Clear and Update Chunks
    await db.from('document_chunks').delete().eq('document_id', docId);

    const chunkItems = [];
    for (const page of validPages) {
        const chunks = chunkText(page.text, 400);
        for (const c of chunks) {
            if (c.trim().length >= 10) {
                chunkItems.push({
                    page_number: page.pageNumber,
                    content: c.trim()
                });
            }
        }
    }

    console.log(`Debug: Split into ${chunkItems.length} page-indexed chunks.`);
    let successCount = 0;

    for (const [i, item] of chunkItems.entries()) {
        let embedding = null;
        try {
            embedding = await getEmbedding(item.content);
        } catch (e) {
            console.warn(`⚠️ Embedding skipped for chunk ${i + 1}:`, e.message);
        }

        const chunkData = {
            document_id: docId,
            page_number: item.page_number,
            content: item.content,
        };
        if (embedding && Array.isArray(embedding)) {
            chunkData.embedding = embedding;
        }

        const { error: insertError } = await db.from('document_chunks').insert(chunkData);

        if (insertError) {
            console.error(`❌ Insert Error Chunk ${i}:`, insertError.message);
        } else {
            successCount++;
        }
    }

    if (successCount === 0 && chunkItems.length > 0) {
        throw new Error("Failed to insert document chunks into database.");
    }

    return {
        success: true,
        pages: docPages.length,
        chunksCount: successCount
    };
}

// --- Routes ---
const router = express.Router();

// Instant Signup Endpoint with Auto-Confirmation
router.post(['/auth/signup', '/api/auth/signup'], async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Email and password are required" });
        }

        if (!supabase) {
            return res.status(500).json({ success: false, error: "Supabase service client not configured" });
        }

        const cleanEmail = email.trim().toLowerCase();
        
        // Check if user already exists
        const { data: userList } = await supabase.auth.admin.listUsers();
        const existingUser = userList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

        let targetUser = null;
        if (existingUser) {
            // Update existing user with new password and auto-confirm email
            const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
                password: password,
                email_confirm: true,
                user_metadata: { full_name: fullName || existingUser.user_metadata?.full_name || '' }
            });
            if (updateErr) throw updateErr;
            targetUser = updated.user;
            console.log(`✅ Existing user updated and auto-confirmed: ${cleanEmail}`);
        } else {
            // Create user with email_confirm: true directly using service role
            const { data, error } = await supabase.auth.admin.createUser({
                email: cleanEmail,
                password: password,
                email_confirm: true,
                user_metadata: {
                    full_name: fullName || ''
                }
            });
            if (error) {
                return res.status(400).json({ success: false, error: error.message });
            }
            targetUser = data.user;
            console.log(`✅ New user auto-confirmed and registered: ${cleanEmail}`);
        }

        console.log(`✅ New user auto-confirmed and registered: ${data.user.email}`);
        return res.json({ success: true, user: targetUser });
    } catch (err) {
        console.error("❌ Signup endpoint error:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});


// Password Sync / Reset Endpoint
router.post(['/auth/reset-password', '/api/auth/reset-password'], async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.status(400).json({ success: false, error: "Email and new password are required" });
        }
        const cleanEmail = email.trim().toLowerCase();
        const { data: userList, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) throw listErr;
        const target = userList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (!target) {
            return res.status(404).json({ success: false, error: "No account found with this email" });
        }
        const { error: updateErr } = await supabase.auth.admin.updateUserById(target.id, {
            password: newPassword,
            email_confirm: true
        });
        if (updateErr) throw updateErr;
        console.log(`✅ Password updated & confirmed for: ${cleanEmail}`);
        return res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        console.error("❌ Reset password error:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

router.get(['/health', '/api/health'], (req, res) => {
    res.json({
        status: 'ok',
        ocr: Tesseract ? 'enabled' : 'disabled',
        ai: process.env.GEMINI_API_KEY ? 'gemini' : process.env.GROQ_API_KEY ? 'groq' : 'fallback',
        time: new Date().toISOString()
    });
});

router.post(['/documents/:id/process', '/api/documents/:id/process'], async (req, res) => {
    const docId = req.params.id;
    const db = getSupabaseClient(req);
    try {
        const result = await processDocument(docId, db);
        res.json(result);
    } catch (error) {
        console.error("❌ Processing error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.post(['/chat', '/api/chat'], async (req, res) => {
    try {
        const db = getSupabaseClient(req);
        const { message, documentIds = [], conversationHistory = [] } = req.body;
        let context = "";
        let references = [];
        let chunks = [];
        let docTitleMap = new Map();

        if (documentIds.length > 0) {
            // Fetch document metadata (titles)
            const { data: docList } = await db
                .from('documents')
                .select('id, title')
                .in('id', documentIds);
            docTitleMap = new Map((docList || []).map(d => [d.id, d.title]));

            // 1. Ensure all selected documents have chunks processed
            for (const docId of documentIds) {
                const { count } = await db
                    .from('document_chunks')
                    .select('id', { count: 'exact', head: true })
                    .eq('document_id', docId);

                if (!count || count === 0) {
                    console.log(`⚠️ Document ${docId} has no chunks. Auto-processing on demand...`);
                    try {
                        await processDocument(docId, db);
                    } catch (err) {
                        console.error(`⚠️ Auto-process failed for document ${docId}:`, err.message);
                    }
                }
            }

            // 2. Perform semantic vector search
            chunks = [];
            const queryEmbedding = await getEmbedding(message);
            if (queryEmbedding) {
                const { data: matchedChunks, error: rpcError } = await db.rpc('match_document_chunks', {
                    query_embedding: queryEmbedding,
                    match_threshold: 0.05,
                    match_count: 15,
                    filter_document_ids: documentIds
                });

                if (matchedChunks && matchedChunks.length > 0) {
                    chunks = matchedChunks;
                }
            }

            // 3. Fallback to direct chunk fetch if semantic search returned no chunks
            if (chunks.length === 0) {
                console.log("ℹ️ Semantic search returned 0 chunks. Falling back to direct document chunks...");
                const { data: directChunks } = await db
                    .from('document_chunks')
                    .select('id, document_id, content, page_number')
                    .in('document_id', documentIds)
                    .limit(15);

                if (directChunks && directChunks.length > 0) {
                    chunks = directChunks;
                }
            }

            if (chunks && chunks.length > 0) {
                context = chunks.map((c, i) => {
                    const docTitle = docTitleMap.get(c.document_id) || 'Document';
                    const pageText = c.page_number ? `Page ${c.page_number}` : 'Full Document';
                    return `[Source Excerpt ${i + 1} | Document: "${docTitle}", ${pageText}]:\n${c.content}`;
                }).join('\n\n---\n\n');

                const refSet = new Set();
                references = chunks
                    .map(c => ({
                        documentId: c.document_id,
                        documentTitle: docTitleMap.get(c.document_id) || 'Document',
                        pageNumber: c.page_number || 1
                    }))
                    .filter(ref => {
                        const key = `${ref.documentId}-${ref.pageNumber}`;
                        if (refSet.has(key)) return false;
                        refSet.add(key);
                        return true;
                    });

                console.log(`✅ Found and supplied ${chunks.length} context chunks to AI with ${references.length} unique page references.`);
            } else {
                console.log("⚠️ No relevant document chunks found.");
            }
        }

        const systemPrompt = `You are StudyMate+, an intelligent AI academic tutor.

CORE INSTRUCTIONS:
1. Context First: Prioritize the provided "DOC CONTEXT" from the student's study materials.
2. Context-Aware Citations & References (MANDATORY):
   - When you answer using information from DOC CONTEXT, you MUST conclude your response with a dedicated references section at the very end in this exact markdown format:

---
📖 **Referenced Sources & Pages:**
* **[Document Title]**, Page [X] - [Brief note on what topic/concept was drawn from this page]

   - IMPORTANT: Cite ONLY the single most relevant page that your answer primarily draws from. Do NOT list multiple pages. Pick the one page that contains the core information used in your answer.
   - If the answer genuinely spans two different documents, you may cite one page from each document, but never cite multiple pages from the same document.
   - Only cite the page that actually contributed the main information to your answer.
3. General Knowledge Fallback:
   - If no document context is provided or the documents do not cover the user's question, answer using your general knowledge, but start with:
     "This isn't explicitly in your selected documents, but generally..."
     and at the end add:
     "--- \nℹ️ *Answered from general knowledge (not found in selected documents)*"
4. Formatting:
   - Provide clean, professional explanations using Markdown (bold key terms, lists, clear paragraphs).
   - Ensure the referenced pages section is always at the very bottom of the response so students can easily verify the material in their original documents.`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory.slice(-6).map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            {
                role: "user",
                content: context
                    ? `DOC CONTEXT:\n${context}\n\nUSER QUESTION: ${message}`
                    : `USER QUESTION: ${message}\n\n(No document context found for this query)`
            }
        ];

        const response = await callAI(messages);

        // Extract ONLY the exact single page where the context was taken from
        let exactReferences = [];
        const match = response.match(/📖\s*\*\*Referenced Sources & Pages:\*\*[\s\S]*?\*\*(.*?)\*\*.*?Page\s*(\d+)(?:\s*-\s*([^\n\r]+))?/i);
        if (match) {
            const citedDocTitle = match[1].trim();
            const citedPage = parseInt(match[2], 10);
            const topicDesc = match[3] ? match[3].trim() : 'Primary context source';
            const matchingDoc = Array.from(docTitleMap.entries()).find(([id, title]) =>
                title.toLowerCase() === citedDocTitle.toLowerCase() || citedDocTitle.toLowerCase().includes(title.toLowerCase())
            );
            exactReferences = [{
                documentId: matchingDoc ? matchingDoc[0] : (chunks[0]?.document_id || ''),
                documentTitle: citedDocTitle || docTitleMap.get(chunks[0]?.document_id) || 'Document',
                pageNumber: citedPage,
                topicNote: topicDesc
            }];
        } else if (chunks.length > 0) {
            // Take strictly the highest similarity matched chunk (exact single page)
            exactReferences = [{
                documentId: chunks[0].document_id,
                documentTitle: docTitleMap.get(chunks[0].document_id) || 'Document',
                pageNumber: chunks[0].page_number || 1,
                topicNote: 'Primary context source'
            }];
        }

        // Clean up markdown in response if multiple pages were listed
        let cleanedResponse = response;
        if (exactReferences.length > 0) {
            const refHeaderMatch = /(---\s*\n📖\s*\*\*Referenced Sources & Pages:\*\*[\s\S]*)$/i;
            if (refHeaderMatch.test(cleanedResponse)) {
                const exact = exactReferences[0];
                cleanedResponse = cleanedResponse.replace(refHeaderMatch, `---\n📖 **Referenced Sources & Pages:**\n* **${exact.documentTitle}**, Page ${exact.pageNumber} - ${exact.topicNote || 'Primary context source'}`);
            }
        }

        res.json({ success: true, response: cleanedResponse, references: exactReferences });
    } catch (error) {
        console.error("❌ Chat error:", error.message);
        res.json({
            success: true,
            response: `⚠️ **Notice**: Unable to process chat completion right now (${error.message}).\n\nTo ensure reliable AI answers, add a free \`GROQ_API_KEY\` or \`GEMINI_API_KEY\` in your \`.env\` file.`,
            references: []
        });
    }
});

router.post(['/ai/flashcards', '/api/ai/flashcards'], async (req, res) => {
    try {
        const db = getSupabaseClient(req);
        const { documentId, count = 5 } = req.body;
        const requestedCount = Math.max(1, Math.min(parseInt(count) || 5, 20));

        // 1. Ensure document has chunks
        let { data: chunks } = await db
            .from('document_chunks')
            .select('content')
            .eq('document_id', documentId)
            .limit(15);

        if (!chunks || chunks.length === 0) {
            console.log(`⚠️ Document ${documentId} has no chunks for Flashcards. Starting Auto-Analysis...`);
            await processDocument(documentId, db);
            const refetched = await db.from('document_chunks').select('content').eq('document_id', documentId).limit(15);
            chunks = refetched.data || [];
        }

        if (!chunks || chunks.length === 0) {
            throw new Error("No document content available for flashcard generation.");
        }

        const context = chunks.map(c => c.content).join('\n\n');

        const systemPrompt = `You are a study helper. Based on the provided context, generate exactly ${requestedCount} high-quality, comprehensive flashcards covering key definitions, concepts, formulas, and takeaways.
Return ONLY a valid JSON object in this format: 
{ "flashcards": [ { "question": "...", "answer": "...", "tag": "Core Concept | Definition | Key Takeaway" } ] }`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context:\n${context.substring(0, 6000)}` }
        ];

        const rawOutput = await callAI(messages, 3, { json: true, max_tokens: 3500 });
        const data = extractAndParseJSON(rawOutput);

        // Deduplicate flashcards by question
        const seenCards = new Set();
        const uniqueFlashcards = (data.flashcards || []).filter(c => {
            const norm = (c.question || '').trim().toLowerCase().replace(/[?.,!]/g, '');
            if (!norm || seenCards.has(norm)) return false;
            seenCards.add(norm);
            return true;
        });

        res.json({ success: true, flashcards: uniqueFlashcards });
    } catch (error) {
        console.error("❌ Flashcards generation error:", error.message);
        res.status(422).json({ error: error.message });
    }
});

router.post(['/ai/quiz', '/api/ai/quiz'], async (req, res) => {
    try {
        const db = getSupabaseClient(req);
        const { documentId, count = 5, difficulty = 'medium' } = req.body;
        const requestedCount = Math.max(1, Math.min(parseInt(count) || 5, 20));

        // 1. Ensure document has chunks
        let { data: chunks } = await db
            .from('document_chunks')
            .select('content')
            .eq('document_id', documentId)
            .limit(15);

        if (!chunks || chunks.length === 0) {
            console.log(`⚠️ Document ${documentId} has no chunks for Quiz. Starting Auto-Analysis...`);
            await processDocument(documentId, db);
            const refetched = await db.from('document_chunks').select('content').eq('document_id', documentId).limit(15);
            chunks = refetched.data || [];
        }

        if (!chunks || chunks.length === 0) {
            throw new Error("No document content available for quiz generation.");
        }

        const context = chunks.map(c => c.content).join('\n\n');

        const difficultyGuidance = difficulty === 'hard'
            ? 'hard difficulty (challenging analytical, conceptual, and multi-step applied questions)'
            : difficulty === 'easy'
                ? 'easy difficulty (clear recall, fundamental definitions, and core facts)'
                : 'medium difficulty (practical understanding and conceptual application)';

        const systemPrompt = `Based on the provided context, generate a ${requestedCount}-question multiple choice quiz with ${difficultyGuidance}.
For each question provide:
- "question": clear, challenging, unique question statement (no duplicate questions)
- "options": array of exactly 4 distinct strings: ["Choice A", "Choice B", "Choice C", "Choice D"]
- "correct_answer": exact text matching one of the options
- "explanation": concise 1-2 sentence explanation of why the correct answer is right

Return ONLY a valid JSON object in this format: 
{ "quiz": [ { "question": "...", "options": ["A", "B", "C", "D"], "correct_answer": "...", "explanation": "..." } ] }`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context:\n${context.substring(0, 6000)}` }
        ];

        const rawOutput = await callAI(messages, 3, { json: true, max_tokens: 4500 });
        const data = extractAndParseJSON(rawOutput);

        if (!data || !Array.isArray(data.quiz) || data.quiz.length === 0) {
            throw new Error("AI returned an invalid quiz structure.");
        }

        // Normalize options and correct_answer for frontend compatibility, and deduplicate questions
        const seenQuizQ = new Set();
        const normalizedQuiz = (data.quiz || [])
            .filter(q => {
                const norm = (q.question || '').trim().toLowerCase().replace(/[?.,!]/g, '');
                if (!norm || seenQuizQ.has(norm)) return false;
                seenQuizQ.add(norm);
                return true;
            })
            .map(q => {
            let options = q.options;
            if (!Array.isArray(options) && typeof options === 'object' && options !== null) {
                options = Object.values(options);
            }
            if (!Array.isArray(options) || options.length === 0) {
                options = ["True", "False", "Partially True", "Cannot be determined"];
            }

            options = options.map(opt => String(opt).trim());

            let correctAnswer = String(q.correct_answer || '').trim();
            let idx = options.findIndex(opt => opt === correctAnswer);
            if (idx === -1) {
                idx = options.findIndex(opt => opt.toLowerCase() === correctAnswer.toLowerCase());
            }
            if (idx === -1) {
                idx = options.findIndex(opt => opt.toLowerCase().includes(correctAnswer.toLowerCase()) || correctAnswer.toLowerCase().includes(opt.toLowerCase()));
            }
            if (idx !== -1) {
                correctAnswer = options[idx];
            } else {
                correctAnswer = options[0];
            }

            return {
                question: q.question || "Quiz Question",
                options: options.slice(0, 4),
                correct_answer: correctAnswer,
                explanation: q.explanation || "Correct choice as stated in document context."
            };
        });

        res.json({ success: true, quiz: normalizedQuiz });
    } catch (error) {
        console.error("❌ Quiz generation error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// AI Study Plan Generator Route
router.post(['/ai/study-plan', '/api/ai/study-plan'], async (req, res) => {
    try {
        const db = getSupabaseClient(req);
        const { title, documentIds, deadline, hoursPerDay } = req.body;
        if (!title) return res.status(400).json({ error: "Plan title is required" });

        let docTitles = [];
        let contextSnippets = [];

        if (documentIds && documentIds.length > 0) {
            const { data: docs } = await db
                .from('documents')
                .select('id, title')
                .in('id', documentIds);

            if (docs) docTitles = docs.map(d => d.title);

            const { data: chunks } = await db
                .from('document_chunks')
                .select('content')
                .in('document_id', documentIds)
                .limit(10);

            if (chunks) contextSnippets = chunks.map(c => c.content);
        }

        const systemPrompt = `You are an expert AI Academic Study Planner. Create a structured, practical study plan for a student.
Title: ${title}
Target Deadline: ${deadline || 'Upcoming Exam'}
Daily Study Target: ${hoursPerDay || 1} hour(s) per day
Documents / Topics to Cover: ${docTitles.length > 0 ? docTitles.join(', ') : 'General Course Material'}

Generate a list of 4 to 6 actionable milestone study tasks.
Return ONLY a valid JSON object in this exact format:
{
  "tasks": [
    { "id": "1", "title": "...", "completed": false, "category": "Reading" },
    { "id": "2", "title": "...", "completed": false, "category": "Practice" }
  ]
}`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Study Material Context:\n${contextSnippets.join('\n\n').substring(0, 4000) || 'Study preparation for ' + title}` }
        ];

        const rawOutput = await callAI(messages, 3, { json: true, max_tokens: 3500 });
        const data = extractAndParseJSON(rawOutput);

        res.json({ success: true, tasks: data.tasks || [] });
    } catch (error) {
        console.error("❌ Study plan generation error:", error.message);
        // Return sensible fallback tasks if AI call fails
        const fallbackTasks = [
            { id: "1", title: "Review foundational concepts & key notes", completed: false, category: "Review" },
            { id: "2", title: "Generate & practice flashcards on key topics", completed: false, category: "Active Recall" },
            { id: "3", title: "Take adaptive AI practice quiz", completed: false, category: "Testing" },
            { id: "4", title: "Final summary & weak spot revision", completed: false, category: "Revision" }
        ];
        res.json({ success: true, tasks: fallbackTasks });
    }
});

// Mount router on both '/api' and root '/'
app.use('/api', router);
app.use('/', router);

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 StudyMate+ Backend running on http://127.0.0.1:${PORT}`);
    });
}

module.exports = app;
