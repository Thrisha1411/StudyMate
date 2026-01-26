import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
    ClipboardList,
    ChevronDown,
    Sparkles,
    CheckCircle2,
    Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function Quizzes() {
    const [quizStarted, setQuizStarted] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
    const [showResults, setShowResults] = useState(false)
    const [score, setScore] = useState(0)

    const [documents, setDocuments] = useState<any[]>([])
    const [selectedDocId, setSelectedDocId] = useState<string>('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [quiz, setQuiz] = useState<any[]>([])
    const [hasAnswered, setHasAnswered] = useState(false)

    useEffect(() => {
        fetchDocuments()
    }, [])

    const fetchDocuments = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase.from('documents').select('id, title').eq('user_id', user.id)
            if (data) setDocuments(data)
        } catch (error) {
            console.error("Error fetching docs:", error)
        }
    }

    const handleGenerateQuiz = async () => {
        if (!selectedDocId) {
            toast.error("Please select a document first")
            return
        }

        setIsGenerating(true)
        try {
            const response = await fetch('http://127.0.0.1:3001/api/ai/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: selectedDocId })
            })

            const data = await response.json()
            if (!data.success) throw new Error(data.error || "Failed to generate quiz")

            // Parse response to ensure format
            const generatedQuiz = data.quiz.map((q: any) => ({
                id: Math.random().toString(), // Helper ID
                question: q.question,
                options: q.options,
                correctAnswer: q.options.indexOf(q.correct_answer) // Convert string answer to index
            }))

            if (generatedQuiz.length === 0) throw new Error("No questions generated.")

            setQuiz(generatedQuiz)
            setQuizStarted(true)
            setCurrentQuestion(0)
            setSelectedAnswer(null)
            setShowResults(false)
            setScore(0)
            setHasAnswered(false) // Reset for new quiz
            toast.success("Quiz generated successfully!")

        } catch (error: any) {
            console.error("Quiz Error:", error)
            toast.error(error.message)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleOptionSelect = (index: number) => {
        if (hasAnswered) return
        setSelectedAnswer(index)
        setHasAnswered(true)

        if (index === quiz[currentQuestion].correctAnswer) {
            setScore(prev => prev + 1)
        }
    }

    const handleNext = () => {
        setHasAnswered(false)
        if (currentQuestion < quiz.length - 1) {
            setCurrentQuestion(currentQuestion + 1)
            setSelectedAnswer(null)
        } else {
            setShowResults(true)
        }
    }

    const restartQuiz = () => {
        setQuizStarted(false)
        setQuiz([])
        setScore(0)
        setCurrentQuestion(0)
        setHasAnswered(false)
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto p-4">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Quiz Center</h1>
                <p className="text-slate-600 max-w-2xl mx-auto">
                    Test your knowledge with adaptive AI quizzes generated from your study materials
                </p>
            </div>

            {!quizStarted ? (
                /* Quiz Setup */
                <div className="max-w-2xl mx-auto">
                    <Card className="bg-gradient-to-br from-orange-50/50 to-pink-50/50 border-0 shadow-lg">
                        <CardContent className="p-12">
                            <div className="text-center space-y-6">
                                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center shadow-xl shadow-orange-200">
                                    <ClipboardList className="w-10 h-10 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-2 text-slate-800">Create a Quiz</h2>
                                    <p className="text-slate-500">
                                        Select a document to auto-generate questions
                                    </p>
                                </div>

                                <div className="space-y-4 max-w-md mx-auto text-left">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block text-slate-700">
                                            Select Document
                                        </label>
                                        <div className="relative">
                                            <select
                                                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                                                value={selectedDocId}
                                                onChange={(e) => setSelectedDocId(e.target.value)}
                                            >
                                                <option value="">Choose a document...</option>
                                                {documents.map(doc => (
                                                    <option key={doc.id} value={doc.id}>{doc.title}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    size="lg"
                                    className="gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 shadow-lg shadow-orange-200 font-semibold px-8"
                                    onClick={handleGenerateQuiz}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                    {isGenerating ? 'Generating Quiz...' : 'Generate Quiz'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : !showResults ? (
                /* Quiz Questions */
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Progress */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">
                            Question {currentQuestion + 1} of {quiz.length}
                        </span>
                        <div className="flex gap-2">
                            {quiz.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-colors ${i <= currentQuestion ? 'bg-orange-500' : 'bg-slate-200'}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Question Card */}
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <CardContent className="p-8">
                            <h3 className="text-xl font-bold mb-8 text-slate-800 leading-snug">
                                {quiz[currentQuestion].question}
                            </h3>
                            <div className="space-y-3">
                                {quiz[currentQuestion].options.map((option: string, index: number) => {
                                    const isSelected = selectedAnswer === index
                                    const isCorrect = index === quiz[currentQuestion].correctAnswer

                                    let buttonStyle = 'border-slate-100 hover:border-orange-200 hover:bg-slate-50'
                                    let iconStyle = 'border-slate-300'
                                    let textStyle = 'text-slate-600'

                                    if (hasAnswered) {
                                        if (isCorrect) {
                                            buttonStyle = 'border-green-500 bg-green-50'
                                            iconStyle = 'border-green-500 bg-green-500'
                                            textStyle = 'text-green-900'
                                        } else if (isSelected) {
                                            buttonStyle = 'border-red-500 bg-red-50'
                                            iconStyle = 'border-red-500 bg-red-500'
                                            textStyle = 'text-red-900'
                                        } else {
                                            buttonStyle = 'border-slate-100 opacity-50'
                                        }
                                    } else if (isSelected) {
                                        buttonStyle = 'border-orange-500 bg-orange-50'
                                        iconStyle = 'border-orange-500 bg-orange-500'
                                        textStyle = 'text-orange-900'
                                    }

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleOptionSelect(index)}
                                            disabled={hasAnswered}
                                            className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all duration-200 ${buttonStyle}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${iconStyle}`}
                                                >
                                                    {(hasAnswered ? (isCorrect || isSelected) : isSelected) && (
                                                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                                    )}
                                                </div>
                                                <span className={`font-medium ${textStyle}`}>{option}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Navigation */}
                    <div className="flex justify-end">
                        {hasAnswered && (
                            <Button
                                onClick={handleNext}
                                className="bg-slate-900 text-white hover:bg-slate-800 px-8 h-12 shadow-lg animate-in fade-in slide-in-from-bottom-2"
                            >
                                {currentQuestion === quiz.length - 1 ? 'See Results' : 'Next Question'}
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                /* Results */
                <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
                    <Card className="border-0 shadow-xl overflow-hidden">
                        <CardContent className="p-12 text-center bg-white relative">
                            {/* Background decoration */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500" />

                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                                <CheckCircle2 className="w-12 h-12 text-green-600" />
                            </div>
                            <h2 className="text-3xl font-bold mb-2 text-slate-800">Quiz Completed!</h2>
                            <p className="text-slate-500 mb-8">
                                You've mastered this section. Keep up the great work!
                            </p>

                            <div className="grid grid-cols-3 gap-6 mb-10 max-w-md mx-auto">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-3xl font-bold text-blue-600 mb-1">{Math.round((score / quiz.length) * 100)}%</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-3xl font-bold text-green-600 mb-1">{score}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correct</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-3xl font-bold text-red-500 mb-1">{quiz.length - score}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Incorrect</div>
                                </div>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <Button variant="outline" onClick={restartQuiz} className="border-slate-200 h-12 px-6">
                                    Select New Document
                                </Button>
                                {/* Future feature: Review Answers */}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
