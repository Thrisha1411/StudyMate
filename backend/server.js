const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const pdf = require('pdf-parse');
const axios = require('axios');
const Tesseract = require('tesseract.js');

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
const HF_EMBED_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
const PRIMARY_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";
const BACKUP_MODEL = "Qwen/Qwen2.5-72B-Instruct";

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("🔓 Backend using Service Role Key (Bypassing RLS)");
} else {
    console.warn("⚠️ Backend using Anon Key. Document processing might fail if RLS is enabled.");
}

// --- Helper Functions ---

async function getEmbedding(text) {
    try {
        const response = await axios.post(HF_EMBED_URL,
            { inputs: text.substring(0, 1000) },
            { headers: { "Authorization": `Bearer ${HF_TOKEN}` } }
        );

        let result = response.data;
        // Handle different response formats from Hugging Face
        if (Array.isArray(result) && Array.isArray(result[0])) result = result[0];
        return result;
    } catch (error) {
        console.error("❌ Embedding failure:", error.response?.data || error.message);
        return null;
    }
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

async function callAI(messages, retries = 3, useBackup = false) {
    const model = useBackup ? BACKUP_MODEL : PRIMARY_MODEL;
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
                    "Authorization": `Bearer ${HF_TOKEN}`,
                    "Content-Type": "application/json",
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error(`❌ AI Error (${model}):`, error.response?.data || error.message);
        if ((error.response?.status === 429 || error.response?.status === 503) && retries > 0) {
            await new Promise(r => setTimeout(r, 2000));
            return callAI(messages, retries - 1, useBackup);
        }
        if (!useBackup) return callAI(messages, retries, true);
        throw error;
    }
}

// --- Routes ---

app.get('/health', (req, res) => {
    res.json({ status: 'ok', ocr: 'enabled' })
})

app.post('/api/documents/:id/process', async (req, res) => {
    const docId = req.params.id;
    try {
        console.log(`📄 Processing document: ${docId}`);

        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', docId)
            .single();

        if (fetchError || !doc) {
            console.error("❌ Supabase Fetch Error:", fetchError?.message || "No document returned");
            throw new Error("Document not found");
        }

        const signedUrlResult = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
        if (signedUrlResult.error) throw signedUrlResult.error;

        const fileResponse = await axios.get(signedUrlResult.data.signedUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(fileResponse.data);

        let text = "";
        const lowerPath = doc.file_path.toLowerCase();

        if (lowerPath.endsWith('.pdf')) {
            console.log("📑 Processing PDF...");
            const pdfData = await pdf(buffer);
            text = pdfData.text;
        } else if (lowerPath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            console.log("🖼️ Processing IMAGE with OCR...");
            const { data: { text: extractedText } } = await Tesseract.recognize(buffer, 'eng');
            text = extractedText;
            console.log(`✅ OCR Complete. Extracted ${text.length} chars.`);
        } else {
            text = buffer.toString('utf-8');
        }

        if (!text || text.trim().length < 5) {
            throw new Error("Text extraction failed or content too short.");
        }

        // Clear and Update Chunks
        await supabase.from('document_chunks').delete().eq('document_id', docId);

        const chunks = chunkText(text, 500);
        console.log(`Debug: Split into ${chunks.length} chunks.`);
        let successCount = 0;

        for (const [i, chunk] of chunks.entries()) {
            console.log(`Processing Chunk ${i + 1}/${chunks.length}...`);
            const embedding = await getEmbedding(chunk);

            if (embedding && Array.isArray(embedding)) {
                const { error: insertError } = await supabase.from('document_chunks').insert({
                    document_id: docId,
                    content: chunk,
                    embedding: embedding
                });

                if (insertError) {
                    console.error(`❌ Insert Error Chunk ${i}:`, insertError);
                } else {
                    successCount++;
                }
            } else {
                console.error(`⚠️ Embedding failed for chunk ${i + 1}`);
            }
        }

        if (successCount === 0) {
            console.error("❌ Stats: Chunks:", chunks.length, "Success:", successCount);
            if (chunks.length > 0) {
                throw new Error(`Embedding API Failed for all ${chunks.length} chunks. Check HuggingFace Token/Quota.`);
            } else {
                throw new Error("No text chunks could be created from document.");
            }
        }

        await supabase.from('documents').update({ status: 'ready' }).eq('id', docId);
        console.log(`🎉 Processed ${successCount}/${chunks.length} chunks.`);
        res.json({ success: true, chunks: successCount });
    } catch (error) {
        console.error("❌ Processing error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, documentIds = [], conversationHistory = [] } = req.body;
        let context = "";

        if (documentIds.length > 0) {
            const queryEmbedding = await getEmbedding(message);
            if (queryEmbedding) {
                const { data: chunks, error: rpcError } = await supabase.rpc('match_document_chunks', {
                    query_embedding: queryEmbedding,
                    match_threshold: 0.05, // Lower threshold to get more potential matches
                    match_count: 15, // Increase chunks to give more context (was 5)
                    filter_document_ids: documentIds
                });

                if (chunks && chunks.length > 0) {
                    context = chunks.map(c => `[From Page ${c.page_number}]: ${c.content}`).join('\n\n---\n\n');
                    console.log(`✅ Found ${chunks.length} context chunks.`);
                } else {
                    console.log("⚠️ No relevant document chunks found.");
                }
            }
        }

        const systemPrompt = `You are StudyMate+, an intelligent AI tutor.
        
        INSTRUCTIONS:
        1. Context First: Always prioritize the provided "DOC CONTEXT" (user's files).
        2. Strict Retrieval: If the answer is in the context, explain it using ONLY that information.
        3. General Knowledge Fallback: If the context is missing the answer or unrelated, you MAY answer using your own extensive general knowledge.
        4. Disclaimer: If you use general knowledge, you MUST start with a phrase like: "This isn't explicitly in your documents, but generally..." to let the user know.
        
        Do not refuse to answer unless the question is harmful.`;

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
        res.json({ success: true, response });
    } catch (error) {
        console.error("❌ Chat error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/flashcards', async (req, res) => {
    try {
        const { documentId } = req.body;

        // 1. Fetch context
        let { data: chunks } = await supabase
            .from('document_chunks')
            .select('content')
            .eq('document_id', documentId)
            .limit(10);

        // 2. AUTO-ANALYSIS FALLBACK
        if (!chunks || chunks.length === 0) {
            console.log(`⚠️ Document ${documentId} has no chunks. Starting Auto-Analysis...`);

            // A. Fetch Document Metadata
            const { data: doc } = await supabase.from('documents').select('*').eq('id', documentId).single();
            if (!doc) throw new Error("Document not found.");

            // B. Download File
            const { data: signedData } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60);
            if (!signedData) throw new Error("Could not access file.");

            const fileRes = await axios.get(signedData.signedUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(fileRes.data);

            // C. Extract Text
            let text = "";
            const lowerPath = doc.file_path.toLowerCase();
            if (lowerPath.endsWith('.pdf')) {
                const pdfData = await pdf(buffer);
                text = pdfData.text;
            } else {
                text = buffer.toString('utf-8'); // Fallback/Text files
            }

            if (!text || text.length < 10) throw new Error("Text extraction failed.");

            // D. Chunk & Embed
            const newChunks = chunkText(text, 500);
            console.log(`Debug: Auto-analyzed ${newChunks.length} chunks.`);

            let successCount = 0;
            for (const [i, chunk] of newChunks.entries()) {
                const embedding = await getEmbedding(chunk);
                if (embedding) {
                    const { error } = await supabase.from('document_chunks').insert({
                        document_id: documentId,
                        content: chunk,
                        embedding: embedding
                    });
                    if (error) console.error(`❌ Auto-Insert Error Chunk ${i}:`, error.message);
                    else successCount++;
                } else {
                    console.error(`⚠️ Auto-Embed Failed Chunk ${i}`);
                }
            }
            console.log(`Debug: Successfully inserted ${successCount}/${newChunks.length} chunks.`);

            // Wait for DB propagation
            await new Promise(r => setTimeout(r, 1000));

            // E. Re-fetch chunks for context
            const refetched = await supabase.from('document_chunks').select('content').eq('document_id', documentId).limit(10);
            chunks = refetched.data;

            if (!chunks || chunks.length === 0) {
                console.warn("⚠️ DB Read delay: Using in-memory chunks for context.");
                chunks = newChunks.map(txt => ({ content: txt }));
            }
        }

        const context = chunks.map(c => c.content).join('\n\n');

        const systemPrompt = `You are a study helper. Based on the context, generate 5 highly effective flashcards.
        Return ONLY a JSON object in this format: 
        { "flashcards": [ { "question": "...", "answer": "...", "tag": "..." } ] }`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context:\n${context.substring(0, 4000)}` }
        ];

        const rawOutput = await callAI(messages);

        // Extraction logic
        const jsonStart = rawOutput.indexOf('{');
        const jsonEnd = rawOutput.lastIndexOf('}');
        const jsonStr = rawOutput.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonStr);

        res.json({ success: true, flashcards: data.flashcards });
    } catch (error) {
        console.error("❌ Flashcards generation error:", error.message);
        // Returns 422 for analysis errors so frontend knows to stop retrying
        res.status(422).json({ error: error.message });
    }
});

app.post('/api/ai/quiz', async (req, res) => {
    try {
        const { documentId } = req.body;

        // 1. Fetch context
        let { data: chunks } = await supabase
            .from('document_chunks')
            .select('content')
            .eq('document_id', documentId)
            .limit(10);

        // 2. AUTO-ANALYSIS FALLBACK (Same as Flashcards)
        if (!chunks || chunks.length === 0) {
            console.log(`⚠️ Document ${documentId} has no chunks for Quiz. Starting Auto-Analysis...`);

            // A. Fetch Document Metadata
            const { data: doc } = await supabase.from('documents').select('*').eq('id', documentId).single();
            if (!doc) throw new Error("Document not found.");

            // B. Download File
            const { data: signedData } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60);
            if (!signedData) throw new Error("Could not access file.");

            const fileRes = await axios.get(signedData.signedUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(fileRes.data);

            // C. Extract Text
            let text = "";
            const lowerPath = doc.file_path.toLowerCase();
            if (lowerPath.endsWith('.pdf')) {
                const pdfData = await pdf(buffer);
                text = pdfData.text;
            } else {
                text = buffer.toString('utf-8');
            }

            if (!text || text.length < 10) throw new Error("Text extraction failed.");

            // D. Chunk & Embed
            const newChunks = chunkText(text, 500);
            console.log(`Debug: Quiz Auto-analyzed ${newChunks.length} chunks.`);

            let successCount = 0;
            for (const [i, chunk] of newChunks.entries()) {
                const embedding = await getEmbedding(chunk);
                if (embedding) {
                    const { error } = await supabase.from('document_chunks').insert({
                        document_id: documentId,
                        content: chunk,
                        embedding: embedding
                    });
                    if (error) console.error(`❌ Auto-Insert Error Chunk ${i}:`, error.message);
                    else successCount++;
                }
            }

            // Wait for DB propagation
            await new Promise(r => setTimeout(r, 1000));

            // E. Re-fetch or Use In-Memory
            const refetched = await supabase.from('document_chunks').select('content').eq('document_id', documentId).limit(10);
            chunks = refetched.data;

            if (!chunks || chunks.length === 0) {
                console.warn("⚠️ DB Read delay: Using in-memory chunks for context.");
                chunks = newChunks.map(txt => ({ content: txt }));
            }
        }

        const context = chunks.map(c => c.content).join('\n\n');

        const systemPrompt = `Based on the context, generate a 5-question multiple choice quiz.
        Return ONLY a JSON object: 
        { "quiz": [ { "question": "...", "options": ["A", "B", "C", "D"], "correct_answer": "..." } ] }`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context:\n${context.substring(0, 4000)}` }
        ];

        const rawOutput = await callAI(messages);
        const jsonStart = rawOutput.indexOf('{');
        const jsonEnd = rawOutput.lastIndexOf('}');
        const jsonStr = rawOutput.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonStr);

        res.json({ success: true, quiz: data.quiz });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StudyMate+ Backend running on http://127.0.0.1:${PORT}`)
})
