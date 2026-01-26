// Database Types
export interface Profile {
    id: string
    full_name: string
    created_at: string
}

export interface Document {
    id: string
    user_id: string
    title: string
    file_path: string
    language: string
    subject?: string
    pages?: number
    summary?: string
    status: 'uploaded' | 'processing' | 'ready' | 'failed'
    created_at: string
}

export interface DocumentChunk {
    id: string
    document_id: string
    page_number?: number
    content: string
    embedding?: number[]
    created_at: string
}

export interface QASession {
    id: string
    user_id: string
    title: string
    created_at: string
}

export interface QAMessage {
    id: string
    session_id: string
    role: 'user' | 'assistant'
    content: string
    created_at: string
}

export interface Flashcard {
    id: string
    user_id: string
    document_id: string
    question: string
    answer: string
    difficulty: 'easy' | 'medium' | 'hard'
    tag?: string
    due_date: string
    last_reviewed?: string
    created_at: string
}

export interface Quiz {
    id: string
    user_id: string
    document_id: string
    difficulty: 'easy' | 'medium' | 'hard'
    language: string
    score: number
    total_questions: number
    created_at: string
}

export interface QuizQuestion {
    id: string
    quiz_id: string
    question: string
    options: string[]
    correct_answer: string
    user_answer?: string
    explanation?: string
}

export interface StudyPlan {
    id: string
    user_id: string
    title: string
    goal_type: 'daily' | 'weekly'
    goal_value: number
    start_date: string
    end_date?: string
    status: 'active' | 'completed' | 'paused'
    created_at: string
}

export interface StudyPlanItem {
    id: string
    plan_id: string
    document_id: string
    task_title: string
    completed: boolean
}

export interface FocusSession {
    id: string
    user_id: string
    duration_minutes: number
    completed: boolean
    created_at: string
}

export interface CollabRoom {
    id: string
    owner_id: string
    room_name: string
    created_at: string
}

export interface CollabRoomMember {
    id: string
    room_id: string
    user_id: string
    joined_at: string
}

export interface AIJob {
    id: string
    document_id: string
    job_type: 'chunking' | 'embeddings' | 'flashcards' | 'quiz'
    status: 'queued' | 'running' | 'completed' | 'failed'
    created_at: string
}

// UI Types
export interface DashboardStats {
    documentsThisWeek: number
    todayStudyMinutes: number
    performanceAverage: number
    weekSessions: number
    dueReviews: number
    activePlans: number
}

export interface Activity {
    id: string
    type: 'qa' | 'quiz' | 'flashcard' | 'upload'
    title: string
    timestamp: string
    metadata?: Record<string, any>
}

export interface Reference {
    documentTitle: string
    pageNumber?: number
    snippet: string
}
