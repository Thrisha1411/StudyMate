const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const key = process.env.GEMINI_API_KEY;

async function testPrompt() {
  const systemPrompt = `You are StudyMate+, an intelligent AI academic tutor.

CORE INSTRUCTIONS:
1. Context First: Answer questions using the provided "DOC CONTEXT" from the student's study material.
2. Context-Aware Citations & References (MANDATORY):
   - Whenever you answer or explain concepts from the provided DOC CONTEXT, you MUST conclude your response with a dedicated references section at the very end in this exact markdown format:

---
📖 **Referenced Sources & Pages:**
* **[Document Title]**, Page [X] - [Brief note on what topic/concept was drawn from this page]

   - IMPORTANT: Cite ONLY the single exact page from which the primary context was taken. Do NOT list multiple pages even if the concept is mentioned across several pages. Pick the one exact page containing the core information.
   - Only cite the exact page that actually contributed the primary information to your answer.
3. General Knowledge Fallback:
   - If no document context is provided or the documents do not cover the question, answer using your general knowledge, but start with:
     "This isn't explicitly in your selected documents, but generally..."
     and at the end add:
     "--- \nℹ️ *Answered from general knowledge (not found in selected documents)*"
4. Formatting:
   - Provide clear, well-structured explanations using markdown (bolding, bullet points, headers).
   - Ensure the referenced pages section is always at the very bottom of the response so students can easily verify the material in their original documents.`;

  const context = `[Source Excerpt 1 | Document: "CNS Unit-2 Notes", Page 3]:
A block cipher is one in which a block of plaintext is treated as a whole and used to produce a ciphertext block of equal length. Typically, a block size of 64 or 128 bits is used. As with a stream cipher, the two users share a symmetric encryption key. Many block ciphers have a Feistel cipher structure.

---

[Source Excerpt 2 | Document: "CNS Unit-2 Notes", Page 5]:
Feistel proposed that we can approximate the ideal block cipher by utilizing the concept of a product cipher, which is the execution of two or more simple ciphers in sequence in such a way that the final result or product is cryptographically stronger than any of the component ciphers. The essence of the Feistel cipher is the alternating use of substitution and permutation.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'DOC CONTEXT:\n' + context + '\n\nUSER QUESTION: What is a block cipher and how does Feistel structure relate to it?' }
  ];

  const res = await axios.post('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    model: 'gemini-2.5-flash',
    messages: messages
  }, {
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' }
  });

  console.log(res.data.choices[0].message.content);
}
testPrompt();
