# StudyMate+ - AI Study Companion

A production-ready AI-powered academic assistant web application that helps students upload study materials (PDFs), interact with them using AI, generate flashcards & quizzes, track progress, plan study schedules, and collaborate in group study rooms.

## 🎯 Features

### Core Features
- **📚 Document Library** - Upload and manage PDF study materials
- **💬 AI Q&A** - Ask questions about your documents with contextual AI responses
- **🎴 Smart Flashcards** - AI-generated flashcards with spaced repetition
- **📝 Adaptive Quizzes** - Difficulty-aware quiz generation
- **⏱️ Focus Timer** - Pomodoro timer for study sessions
- **📅 Study Planner** - Organize and track study goals
- **👥 Collaboration** - Group study rooms with shared resources
- **📊 Progress Dashboard** - Track your learning journey

### Technical Features
- **Authentication** - Secure user authentication with Supabase Auth
- **File Storage** - PDF storage with Supabase Storage
- **Database** - PostgreSQL with Row Level Security (RLS)
- **AI Integration** - RAG pipeline for document Q&A
- **Responsive Design** - Mobile-first, fully responsive UI
- **Premium UX** - Smooth animations, glassmorphism, modern design

## 🛠️ Tech Stack

### Frontend
- **Vite** - Fast build tool
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Lucide Icons** - Beautiful icons

### Backend & Database
- **Supabase Auth** - User authentication
- **Supabase Storage** - File storage
- **Supabase PostgreSQL** - Database with RLS
- **pgvector** - Vector embeddings for AI

### AI Layer (To be implemented)
- **RAG Pipeline** - Retrieval Augmented Generation
- **OpenAI API** - For embeddings and completions
- **Multi-PDF Q&A** - Contextual document search

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)

### Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd STUDYmate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Project Settings > API
   - Copy your project URL and anon key
   - Run the SQL from `supabase-setup.sql` in the SQL Editor

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 🗄️ Database Schema

The application uses the following main tables:

- **profiles** - User profiles
- **documents** - Uploaded PDF documents
- **document_chunks** - Document chunks for RAG
- **qa_sessions** - Q&A conversation sessions
- **qa_messages** - Individual Q&A messages
- **flashcards** - Generated flashcards
- **quizzes** - Quiz attempts
- **quiz_questions** - Quiz questions and answers
- **study_plans** - Study planning
- **study_plan_items** - Plan tasks
- **focus_sessions** - Timer sessions
- **collab_rooms** - Study group rooms
- **collab_room_members** - Room membership
- **ai_jobs** - Background AI processing jobs

See `supabase-setup.sql` for the complete schema with RLS policies.

## 🚀 Deployment

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

### Deploy to Vercel/Netlify
1. Connect your repository
2. Set environment variables
3. Deploy!

## 📝 Project Structure

```
STUDYmate/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   └── Sidebar.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Badge.tsx
│   │       ├── Skeleton.tsx
│   │       └── EmptyState.tsx
│   ├── pages/
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Library.tsx
│   │   ├── Study.tsx
│   │   ├── Flashcards.tsx
│   │   ├── Quizzes.tsx
│   │   ├── Timer.tsx
│   │   ├── Planner.tsx
│   │   └── Collaborate.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🎨 Design System

The application uses a carefully crafted design system:

- **Colors**: Soft pastels with vibrant accents
- **Typography**: Inter font family
- **Spacing**: Consistent 8px grid
- **Shadows**: Subtle elevation
- **Animations**: Smooth transitions and micro-interactions
- **Components**: Reusable, accessible UI components

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Secure file storage with access controls
- Environment variables for sensitive data

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- Powered by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

## 📧 Support

For support, email support@studymateplus.com or open an issue in the repository.

---

Made with ❤️ for students everywhere
