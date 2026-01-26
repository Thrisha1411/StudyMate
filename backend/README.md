# StudyMate+ Backend

Simple Node.js backend for AI chat functionality.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### 3. Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your OpenAI API key
# Replace 'your-openai-api-key-here' with your actual key
```

Your `.env` file should look like:
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
PORT=3001
```

### 4. Start the Server

```bash
npm run dev
```

You should see:
```
🚀 StudyMate+ Backend running on http://localhost:3001
📝 Health check: http://localhost:3001/health
💬 Chat endpoint: http://localhost:3001/api/chat
✅ OpenAI API key configured
```

### 5. Test the Backend

Open a new terminal and test:

```bash
# Health check
curl http://localhost:3001/health

# Test chat
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is machine learning?"}'
```

## API Endpoints

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "message": "StudyMate+ Backend is running"
}
```

### POST /api/chat
Send a message to the AI

**Request:**
```json
{
  "message": "What is machine learning?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message"
    },
    {
      "role": "assistant",
      "content": "Previous response"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Machine learning is...",
  "usage": {
    "promptTokens": 50,
    "completionTokens": 100,
    "totalTokens": 150
  }
}
```

## Cost Estimation

- **GPT-3.5-Turbo**: $0.002 per 1K tokens
- Average message: ~150 tokens
- **Cost per message**: ~$0.0003 (less than 1 cent)
- **100 messages**: ~$0.03

## Troubleshooting

### "OpenAI API key not configured"
- Make sure you created `.env` file (not `.env.example`)
- Check that your API key is correct
- Restart the server after changing `.env`

### "insufficient_quota"
- Your OpenAI account needs billing set up
- Add a payment method at https://platform.openai.com/account/billing

### "CORS error"
- The backend has CORS enabled for all origins
- Make sure backend is running on port 3001
- Frontend should call `http://localhost:3001/api/chat`

## Next Steps

Once the backend is running:

1. Update frontend to call the backend (see FRONTEND_UPDATE.md)
2. Test the chat functionality
3. (Optional) Add document processing for context-aware answers

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` file to Git
- Never share your OpenAI API key
- The `.env` file is already in `.gitignore`
- For production, use environment variables on your hosting platform
