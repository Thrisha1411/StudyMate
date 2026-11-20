# StudyMate+ 🎓

**StudyMate+** is an advanced AI-powered study companion designed to transform how students engage with their learning materials. By combining document management, intelligent Q&A with voice interaction, precise page citations, active recall flashcards, and adaptive quizzes, it provides a complete environment for mastering any subject.

## ✨ Key Features

- **📚 Smart Library & OCR**: Upload and organize PDFs and study notes in one place with automatic text extraction and OCR support.
- **🤖 AI-Powered Study Chat**:
  - Ask questions directly against your uploaded documents with semantic vector search.
  - **🎙️ Speech-to-Text (Voice Input)**: Speak your questions directly into the chatbox using microphone input.
  - **🔊 Text-to-Speech (Voice Output)**: Listen to AI explanations read aloud with natural voice synthesis.
  - **📖 Exact Page Citations**: Direct reference pills showing the exact page context was retrieved from, with one-click jump-to-page navigation.
- **⚡ Interactive Flashcards**: Generate isolated flashcard decks by document, with active recall practice, flip animations, mastery tracking, and PDF export.
- **📝 Instant & In-Depth Quizzes**: Generate multiple-choice practice quizzes tailored to your study topics across easy, medium, and hard difficulty levels with detailed explanations.
- **⏱️ Focus Mode & Timer**: Stay productive with a built-in Pomodoro timer featuring floating widgets and break tracking.
- **📊 Progress Dashboard**: Track your study streaks, hours learned, and document completion status.

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **State & UI**: Lucide React, Sonner, Framer Motion, Radix UI, Markdown rendering
- **Backend**: Express.js, Node.js
- **Database & Auth**: Supabase (PostgreSQL, Service Role Auth, Storage, Vector Chunks)
- **AI Engines**: Google Gemini API (2.5-Flash / 3.5-Flash), Groq, Hugging Face
- **PDF & OCR Engine**: PDF.js, PDF-Parse, Tesseract OCR

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A Supabase project
- A Google Gemini API key (free from [Google AI Studio](https://aistudio.google.com/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Thrisha1411/StudyMate.git
   cd StudyMate
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Set up Environment Variables**
   - In the root directory, create `.env` using `.env.example`:
     ```env
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - In the `backend/` directory, create `.env` using `backend/.env.example`:
     ```env
     PORT=3001
     GEMINI_API_KEY=your_gemini_api_key
     SUPABASE_URL=your_supabase_url
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     ```

5. **Run the Application**

   *Run both servers concurrently:*
   ```bash
   npm run dev:all
   ```

   *Or run them in separate terminals:*

   *Terminal 1 (Backend):*
   ```bash
   cd backend
   npm run dev
   ```

   *Terminal 2 (Frontend):*
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🔒 Security Note

This project uses `.env` files for sensitive API keys and service credentials. **Never commit `.env` files to git.** The `.gitignore` is already configured to keep your secrets private.
