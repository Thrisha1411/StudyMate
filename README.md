# StudyMate🎓

**StudyMate** is an advanced AI-powered study companion designed to transform how students engage with their learning materials. By combining document management, intelligent Q&A, and productivity tools, it provides a seamless environment for mastering any subject.

## ✨ Key Features

- **📚 Smart Library**: Upload and organize your PDFs and study documents in one place.
- **🤖 AI-Powered Study Chat**: Ask questions directly to your documents. The AI understands context and provides accurate answers from your materials.
- **⚡ Interactive Flashcards**: Automatically generate flashcards from your content and review them using spaced repetition.
- **📝 Instant Quizzes**: Test your knowledge with AI-generated quizzes tailored to your study topics.
- **⏱️ Focus Mode & Timer**: Stay productive with a built-in Pomodoro timer that includes a floating widget and break tracking.
- **📊 Progress Dashboard**: Track your study streaks, hours learned, and document completion status.
- **🤝 Collaboration Rooms**: Join study rooms to learn with peers (Coming Soon).

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **State Management**: React Hooks & Context API
- **Backend / Database**: Supabase (PostgreSQL, Auth, Storage)
- **AI Processing**: Integration with Hugging Face / Custom PDF parsing backend
- **UI Components**: Lucide React, Framer Motion

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- A Supabase account

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Thrisha1411/StudyMate.git
    cd StudyMate
    ```

2.  **Install Frontend Dependencies**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies**
    ```bash
    cd backend
    npm install
    cd ..
    ```

4.  **Set up Environment Variables**
    Create a `.env` file in the root directory and add your keys (see `.env.example`).

5.  **Run the Application**
    You need to run both the frontend and backend servers:

    *Terminal 1 (Backend):*
    ```bash
    cd backend
    npm run dev
    ```

    *Terminal 2 (Frontend):*
    ```bash
    npm run dev
    ```

## 🔒 Security Note

This project uses `.env` files for sensitive keys. **Never push your `.env` file to GitHub.** The `.gitignore` is already configured to prevent this.

