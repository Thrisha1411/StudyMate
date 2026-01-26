import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import {
    CreditCard,
    ChevronDown,
    RotateCw,
    Check,
    X,
    Sparkles,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'

export function Flashcards() {
    const [flipped, setFlipped] = useState(false)
    const [currentCard, setCurrentCard] = useState(0)
    const [flashcards, setFlashcards] = useState<any[]>([])
    const [documents, setDocuments] = useState<any[]>([])
    const [selectedDocId, setSelectedDocId] = useState<string>('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch user documents
            const { data: docs } = await supabase
                .from('documents')
                .select('id, title')
                .eq('user_id', user.id)

            if (docs) setDocuments(docs)

            // Fetch existing flashcards
            const { data: existingCards } = await supabase
                .from('flashcards')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (existingCards) setFlashcards(existingCards)
        } catch (error) {
            console.error("Error fetching flashcards:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleGenerate = async () => {
        if (!selectedDocId) {
            alert("Please select a document first")
            return
        }

        setIsGenerating(true)
        try {
            // Attempt Generation
            let response = await fetch('http://127.0.0.1:3001/api/ai/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: selectedDocId })
            })

            let data = await response.json()

            // Backend now handles auto-analysis if chunks are missing.
            // We just wait for the response (which might take longer).

            if (!data.success) throw new Error(data.error)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Save generated flashcards to Supabase
            const newCardsForDb = data.flashcards.map((card: any) => ({
                user_id: user.id,
                document_id: selectedDocId,
                question: card.question,
                answer: card.answer,
                tag: card.tag || 'AI Generated',
                difficulty: 'medium'
            }))

            const { data: insertedCards, error } = await supabase
                .from('flashcards')
                .insert(newCardsForDb)
                .select()

            if (error) throw error

            // ... (adding import at top, actually I need to do it as a separate chunk or just assume it's there? No, I must add it.)
            // wait, I can't add import at line 134. I'll stick to replacing alerts here first.

            if (insertedCards) {
                setFlashcards(prev => [...insertedCards, ...prev])
                toast.success(`Successfully generated ${insertedCards.length} flashcards!`)
            }

        } catch (error: any) {
            console.error("Failed to generate:", error)
            toast.error(`Generation failed: ${error.message}`)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleNext = () => {
        setFlipped(false)
        setCurrentCard((prev) => (prev + 1) % flashcards.length)
    }

    const handlePrevious = () => {
        setFlipped(false)
        setCurrentCard((prev) => (prev - 1 + flashcards.length) % flashcards.length)
    }

    const deleteCard = async (id: string) => {
        try {
            await supabase.from('flashcards').delete().eq('id', id)
            setFlashcards(prev => prev.filter(c => c.id !== id))
            if (currentCard >= flashcards.length - 1 && currentCard > 0) {
                setCurrentCard(prev => prev - 1)
            }
        } catch (error) {
            console.error("Delete failed:", error)
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500">Loading your flashcards...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto p-4">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Flashcard Hub</h1>
                <p className="text-slate-600 max-w-2xl mx-auto">
                    Review your personalized study material and boost your retention
                </p>
            </div>

            {/* Generate Section */}
            <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-0 shadow-lg">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-xl shadow-blue-200">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Generate Flashcards</h3>
                            <p className="text-sm text-slate-500">
                                Select an analyzed document to auto-generate interactive flashcards.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <div className="relative flex-1 sm:w-60">
                                <select
                                    className="appearance-none w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer h-11 transition-all"
                                    value={selectedDocId}
                                    onChange={(e) => setSelectedDocId(e.target.value)}
                                >
                                    <option value="">Select Document</option>
                                    {documents.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.title}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                            <Button
                                className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 gap-2 font-semibold"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {isGenerating ? 'Analyzing & Generating...' : 'Generate'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Flashcard Viewer */}
            {flashcards.length > 0 ? (
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Progress */}
                    <div className="flex items-center justify-between text-sm px-2">
                        <span className="text-slate-500 font-medium">
                            Card {currentCard + 1} of {flashcards.length}
                        </span>
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 px-3 py-1">
                            {flashcards[currentCard].tag}
                        </Badge>
                    </div>

                    {/* Card Container */}
                    <div
                        className="relative h-96 cursor-pointer group"
                        style={{ perspective: '1000px' }}
                        onClick={() => setFlipped(!flipped)}
                    >
                        <div
                            className={`absolute inset-0 transition-all duration-700 ease-in-out`}
                            style={{
                                transformStyle: 'preserve-3d',
                                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                            }}
                        >
                            {/* Front */}
                            <Card className="absolute inset-0 bg-white shadow-2xl border-0 overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                                <CardContent className="h-full flex flex-col items-center justify-center p-12 text-center">
                                    <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-6">Question</div>
                                    <h2 className="text-2xl font-bold text-slate-800 leading-tight mb-8">
                                        {flashcards[currentCard].question}
                                    </h2>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium bg-slate-50 px-4 py-2 rounded-full">
                                        <RotateCw className="w-4 h-4 animate-spin-slow" />
                                        Tap to flip
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Back */}
                            <Card className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl border-0 overflow-hidden"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)'
                                }}
                            >
                                <CardContent className="h-full flex flex-col items-center justify-center p-12 text-center">
                                    <div className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-6">Answer</div>
                                    <p className="text-xl text-white leading-relaxed font-medium">
                                        {flashcards[currentCard].answer}
                                    </p>
                                    <div className="mt-8 flex items-center gap-2 text-blue-100/60 text-sm font-medium">
                                        <RotateCw className="w-4 h-4" />
                                        Tap to see question
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between gap-4 pt-4">
                        <Button
                            variant="outline"
                            className="bg-white border-slate-200 text-slate-600 px-6 h-11"
                            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                        >
                            Previous
                        </Button>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                className="w-12 h-11 bg-white border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-100 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); deleteCard(flashcards[currentCard].id); }}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="w-12 h-11 bg-white border-slate-200 text-green-500 hover:bg-green-50 hover:border-green-100 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            >
                                <Check className="w-5 h-5" />
                            </Button>
                        </div>

                        <Button
                            variant="outline"
                            className="bg-white border-slate-200 text-slate-600 px-6 h-11"
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            ) : (
                <EmptyState
                    icon={<CreditCard className="w-20 h-20 text-blue-100" />}
                    title="Your Deck is Empty"
                    description="Personalized AI flashcards will appear here once you generate them from your study material."
                    action={
                        <div className="flex flex-col gap-4 items-center">
                            <p className="text-sm font-medium text-slate-400">Select a doc above to get started</p>
                            <Button
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 h-12 shadow-xl shadow-blue-200 font-bold"
                                onClick={() => {
                                    // Focus document selector
                                    const select = document.querySelector('select');
                                    select?.focus();
                                }}
                            >
                                <Sparkles className="w-5 h-5 mr-2" />
                                Generate AI Flashcards
                            </Button>
                        </div>
                    }
                />
            )}
        </div>
    )
}
