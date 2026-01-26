import { useState, useEffect, useRef, useCallback } from 'react'
import Markdown from 'react-markdown'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
    Send,
    Bot,
    User,
    BookOpen,
    FileText,
    Pencil,
    Trash2,
    Check,
    Search,
    Maximize2,
    Minimize2,
    Upload,
    ChevronDown,
    X,
    Plus,
    MessageSquare,
    History,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'

export function Study() {
    // --- State Management ---
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>(() => {
        const saved = localStorage.getItem('study_selected_docs')
        return saved ? JSON.parse(saved) : []
    })
    const [documents, setDocuments] = useState<any[]>([])
    const [previewDoc, setPreviewDoc] = useState<any | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    // Chat State
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<Array<{
        id: string
        role: 'user' | 'assistant'
        content: string
        timestamp: Date
    }>>([])
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [sessions, setSessions] = useState<any[]>([])
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')

    // Layout State
    const [focusMode, setFocusMode] = useState(false)
    const [showDocPicker, setShowDocPicker] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [splitRatio, setSplitRatio] = useState(60) // Left panel %
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
    const [editSessionTitle, setEditSessionTitle] = useState('')
    const isResizing = useRef(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Session Tracking
    const [sessionDuration, setSessionDuration] = useState(0)
    const sessionStartTime = useRef<number>(Date.now())
    const lastSaveTime = useRef<number>(Date.now())

    // --- Effects ---

    useEffect(() => {
        localStorage.setItem('study_selected_docs', JSON.stringify(selectedDocuments))
    }, [selectedDocuments])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Study Time Tracking logic
    const saveStudySession = useCallback(async (durationInSeconds: number) => {
        if (durationInSeconds < 10) return; // Don't save very short accidental visits

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            await supabase.from('study_sessions').insert({
                user_id: user.id,
                duration: Math.round(durationInSeconds),
                subject: selectedDocuments.length > 0 ? "Active Document Study" : "General Study"
            })
            console.log(`⏱️ Saved study session: ${durationInSeconds}s`)
        } catch (err) {
            console.error("Failed to save study session:", err)
        }
    }, [selectedDocuments])

    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now()
            const currentSessionSeconds = (now - sessionStartTime.current) / 1000
            setSessionDuration(Math.floor(currentSessionSeconds))

            // Auto-save every minute to prevent data loss
            if (now - lastSaveTime.current > 60000) {
                const chunkToSave = (now - lastSaveTime.current) / 1000
                saveStudySession(chunkToSave)
                lastSaveTime.current = now
            }
        }, 1000)

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                const now = Date.now()
                const finalChunk = (now - lastSaveTime.current) / 1000
                saveStudySession(finalChunk)
                lastSaveTime.current = now
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(timer)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            const now = Date.now()
            const finalChunk = (now - lastSaveTime.current) / 1000
            saveStudySession(finalChunk)
        }
    }, [saveStudySession])


    // Load Documents
    useEffect(() => {
        const fetchDocuments = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                if (data) setDocuments(data)
            }
        }
        fetchDocuments()
    }, [])

    // Initialize Preview (Load first selected doc if available)
    useEffect(() => {
        if (!previewDoc && selectedDocuments.length > 0 && documents.length > 0) {
            const firstDocId = selectedDocuments[0]
            const doc = documents.find(d => d.id.toString() === firstDocId)
            if (doc) loadPreview(doc)
        }
    }, [selectedDocuments, documents])

    // Load Sessions & Active Session
    useEffect(() => {
        fetchSessions()
    }, [])

    const fetchSessions = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('qa_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (data) {
            setSessions(data)
            // If no active session, pick the first one
            if (!sessionId && data.length > 0) {
                switchSession(data[0].id)
            } else if (!sessionId && data.length === 0) {
                createSession("My First Session")
            }
        }
    }

    const createSession = async (title: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: newSession } = await supabase
            .from('qa_sessions')
            .insert({ user_id: user.id, title: title || 'New Session' })
            .select()
            .single()

        if (newSession) {
            setSessions(prev => [newSession, ...prev])
            switchSession(newSession.id)
        }
    }

    const switchSession = async (id: string) => {
        setSessionId(id)
        setIsLoading(true)

        // Fetch messages for this session
        const { data: msgs } = await supabase
            .from('qa_messages')
            .select('*')
            .eq('session_id', id)
            .order('created_at', { ascending: true })

        if (msgs) {
            setMessages(msgs.map(m => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                timestamp: new Date(m.created_at)
            })))
        } else {
            setMessages([])
        }
        setIsLoading(false)
    }

    const deleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("Delete this chat session?")) return

        await supabase.from('qa_sessions').delete().eq('id', id)
        setSessions(prev => prev.filter(s => s.id !== id))
        if (sessionId === id) {
            setMessages([])
            setSessionId(null)
            // If others exist, switch
            const others = sessions.filter(s => s.id !== id)
            if (others.length > 0) switchSession(others[0].id)
        }
    }

    const startEditingSession = (session: any, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingSessionId(session.id)
        setEditSessionTitle(session.title)
    }

    const saveSessionTitle = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!editSessionTitle.trim()) return

        // Optimistic update
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editSessionTitle } : s))
        setEditingSessionId(null)

        const { error } = await supabase
            .from('qa_sessions')
            .update({ title: editSessionTitle })
            .eq('id', id)

        if (error) {
            console.error("Error renaming session:", error)
        }
    }

    const cancelEditingSession = (e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingSessionId(null)
        setEditSessionTitle('')
    }

    // --- Logic ---

    const loadPreview = async (doc: any) => {
        if (previewDoc?.id === doc.id) return
        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .createSignedUrl(doc.file_path, 3600)
            if (error) throw error
            setPreviewDoc(doc)
            setPreviewUrl(data.signedUrl)
        } catch (err) {
            console.error("Preview error:", err)
        }
    }

    const toggleDocument = (id: string) => {
        setSelectedDocuments(prev => {
            if (prev.includes(id)) {
                return prev.filter(d => d !== id)
            }
            if (prev.length >= 6) {
                alert("Max 6 documents allowed.")
                return prev
            }
            return [...prev, id]
        })
    }

    const cancelEditing = () => {
        setEditingMessageId(null)
        setEditText('')
    }

    // Resizing
    const [isDragging, setIsDragging] = useState(false)
    const leftPanelRef = useRef<HTMLDivElement>(null)
    const rightPanelRef = useRef<HTMLDivElement>(null)

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(true)
        isResizing.current = true
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', stopResizing)
    }, [])

    const stopResizing = useCallback(() => {
        isResizing.current = false
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', stopResizing)
        // Sync final state
        if (leftPanelRef.current) {
            const width = parseFloat(leftPanelRef.current.style.width)
            if (!isNaN(width)) setSplitRatio(width)
        }
    }, [])

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isResizing.current && leftPanelRef.current && rightPanelRef.current) {
            const containerWidth = window.innerWidth
            const newPercentage = (e.clientX / containerWidth) * 100
            if (newPercentage > 20 && newPercentage < 80) {
                // Direct DOM update for performance
                leftPanelRef.current.style.width = `${newPercentage}%`
                rightPanelRef.current.style.width = `${100 - newPercentage}%`
            }
        }
    }, [])

    // Chat Functions (Send, Edit, Delete, Copy) - Copied from previous logic
    const handleSend = async () => {
        if (!message.trim()) return

        const userMessage = {
            id: Date.now().toString(),
            role: 'user' as const,
            content: message,
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMessage])
        setMessage('')
        setIsLoading(true)

        if (sessionId) {
            await supabase.from('qa_messages').insert({
                session_id: sessionId,
                role: 'user',
                content: message
            })
        }

        try {
            const response = await fetch('http://127.0.0.1:3001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    documentIds: selectedDocuments,
                    conversationHistory: messages.map(msg => ({ role: msg.role, content: msg.content }))
                }),
            })
            const data = await response.json()
            if (data.error) throw new Error(data.error)

            const aiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: data.response || "No response generated.",
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, aiMessage])

            if (sessionId) {
                await supabase.from('qa_messages').insert({
                    session_id: sessionId,
                    role: 'assistant',
                    content: aiMessage.content
                })
            }
        } catch (error: any) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Error: " + error.message,
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const saveEdit = async (id: string) => {
        if (!editText.trim()) return

        // 1. Find index
        const editedMsgIndex = messages.findIndex(m => m.id === id)
        if (editedMsgIndex === -1) return

        // 2. Prune local history
        const keptMessages = messages.slice(0, editedMsgIndex + 1)
        keptMessages[keptMessages.length - 1].content = editText
        setMessages(keptMessages)
        setEditingMessageId(null)
        setIsLoading(true)

        // 3. Update DB
        if (sessionId) {
            await supabase.from('qa_messages').update({ content: editText }).eq('id', id)
            // Delete future messages
            const { data: futureMsgs } = await supabase.from('qa_messages').select('id')
                .eq('session_id', sessionId)
                .gt('created_at', messages[editedMsgIndex].timestamp.toISOString())
            if (futureMsgs?.length) await supabase.from('qa_messages').delete().in('id', futureMsgs.map(m => m.id))
        }

        // 4. Resend
        try {
            const response = await fetch('http://127.0.0.1:3001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: editText,
                    documentIds: selectedDocuments,
                    conversationHistory: keptMessages.slice(0, -1).map(msg => ({ role: msg.role, content: msg.content }))
                }),
            })
            const data = await response.json()
            const aiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: data.response || "No response.",
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, aiMessage])
            if (sessionId) await supabase.from('qa_messages').insert({ session_id: sessionId, role: 'assistant', content: aiMessage.content })
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const deleteMessage = async (id: string) => {
        if (!confirm("Delete this message?")) return

        const msgIndex = messages.findIndex(m => m.id === id)
        if (msgIndex === -1) return

        const idsToDelete = [id]
        if (messages[msgIndex].role === 'user') {
            const nextMsg = messages[msgIndex + 1]
            if (nextMsg && nextMsg.role === 'assistant') idsToDelete.push(nextMsg.id)
        }

        setMessages(prev => prev.filter(m => !idsToDelete.includes(m.id)))
        if (sessionId) await supabase.from('qa_messages').delete().in('id', idsToDelete)
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`
    }

    const filteredDocs = documents.filter(doc => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))

    return (
        <div className={`flex flex-col h-[calc(100vh-4rem)] ${focusMode ? 'fixed inset-0 z-50 bg-white h-screen' : ''}`}>
            <style>{`
                .markdown-content h1, .markdown-content h2, .markdown-content h3 { 
                    font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; line-height: 1.25; 
                }
                .markdown-content h1 { font-size: 1.125rem; }
                .markdown-content h2 { font-size: 1rem; }
                .markdown-content h3 { font-size: 0.875rem; }
                .markdown-content p { margin-bottom: 0.75rem; }
                .markdown-content ul, .markdown-content ol { padding-left: 1.25rem; margin-bottom: 0.75rem; }
                .markdown-content li { margin-bottom: 0.25rem; }
                .markdown-content strong { font-weight: 600; color: #1e293b; }
                
                @media (max-width: 768px) {
                    .study-panel-left { width: 100% !important; height: 40% !important; }
                    .study-panel-right { width: 100% !important; height: 60% !important; }
                }
            `}</style>

            {/* --- Top Bar --- */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0 z-20">
                <div className="flex items-center gap-4">
                    {focusMode ? (
                        <Button variant="ghost" size="icon" onClick={() => setFocusMode(false)}>
                            <Minimize2 className="w-5 h-5" />
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 relative">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
                                <BookOpen className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-lg text-slate-800 tracking-tight">Smart Study</span>
                        </div>
                    )}

                    {/* Document Picker */}
                    <div className="relative relative-picker">
                        <Button
                            variant="outline"
                            className="bg-slate-50 border-slate-200 text-slate-700 min-w-[200px] justify-between"
                            onClick={() => setShowDocPicker(!showDocPicker)}
                        >
                            <span className="truncate max-w-[150px]">
                                {selectedDocuments.length === 0 ? "Select Documents" : `${selectedDocuments.length} Selected`}
                            </span>
                            <ChevronDown className="w-4 h-4 opacity-50" />
                        </Button>

                        {showDocPicker && (
                            <div className="absolute top-full left-0 mt-2 w-[350px] bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95">
                                <div className="relative mb-2">
                                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Search documents..."
                                        className="pl-9 h-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-[300px] overflow-y-auto space-y-1">
                                    {filteredDocs.map(doc => {
                                        const isSelected = selectedDocuments.includes(doc.id.toString())
                                        return (
                                            <div
                                                key={doc.id}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                                onClick={() => toggleDocument(doc.id.toString())}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{doc.title}</p>
                                                    <p className="text-xs text-slate-400 truncate">{new Date(doc.created_at).toLocaleDateString()}</p>
                                                </div>
                                                {isSelected && (
                                                    <div
                                                        className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); toggleDocument(doc.id.toString()); }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                    {filteredDocs.length === 0 && <p className="text-center text-xs text-slate-400 py-4">No documents found.</p>}
                                </div>
                                <div className="pt-2 mt-2 border-t flex justify-between">
                                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSelectedDocuments([])}>Clear</Button>
                                    <Button size="sm" className="text-xs" onClick={() => setShowDocPicker(false)}>Done</Button>
                                </div>
                            </div>
                        )}
                        {/* Overlay to close picker */}
                        {showDocPicker && <div className="fixed inset-0 z-40" onClick={() => setShowDocPicker(false)} />}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-medium text-slate-600 font-mono">{formatTime(sessionDuration)}</span>
                    </div>
                    <Link to="/upload">
                        <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
                            <Upload className="w-4 h-4" />
                            Upload More
                        </Button>
                    </Link>
                    <Button
                        variant={focusMode ? "secondary" : "default"}
                        size="sm"
                        className="gap-2"
                        onClick={() => setFocusMode(!focusMode)}
                    >
                        {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        {focusMode ? "Exit Focus" : "Focus Mode"}
                    </Button>
                </div>
            </div>

            {/* --- Main Content Split --- */}
            <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${isDragging ? 'cursor-col-resize select-none' : ''}`}>
                {/* Left Panel: Viewer */}
                <div
                    ref={leftPanelRef}
                    style={{ width: `${splitRatio}%` }}
                    className="flex flex-col border-r bg-slate-50/50 relative study-panel-left w-full h-[40%] md:h-full md:w-auto"
                >
                    {/* Overlay to catch events over iframes during drag */}
                    {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}

                    {/* Viewer Tabs/Header */}
                    <div className="h-10 border-b bg-white flex items-center px-1 gap-1 overflow-x-auto no-scrollbar">
                        {selectedDocuments.length === 0 && <span className="text-xs text-slate-400 px-3">No documents selected</span>}
                        {selectedDocuments.map(docId => {
                            const doc = documents.find(d => d.id.toString() === docId)
                            if (!doc) return null
                            const isActive = previewDoc?.id === doc.id
                            return (
                                <button
                                    key={doc.id}
                                    onClick={() => loadPreview(doc)}
                                    className={`h-full px-3 flex items-center gap-2 text-xs font-medium border-b-2 transition-colors min-w-[100px] max-w-[200px] ${isActive ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{doc.title}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Viewer Canvas */}
                    <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4">
                        {previewUrl ? (
                            previewDoc?.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img
                                    src={previewUrl}
                                    alt={previewDoc?.title}
                                    className="max-w-full max-h-full object-contain shadow-lg"
                                />
                            ) : (
                                <iframe
                                    src={`${previewUrl}#toolbar=0`}
                                    className="w-full h-full rounded shadow-sm bg-white"
                                    title="Document Preview"
                                />
                            )
                        ) : (
                            <div className="text-center text-slate-400">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Select a document to view</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resizer Handle */}
                <div
                    onMouseDown={startResizing}
                    className={`hidden md:flex w-1.5 hover:bg-blue-500 hover:w-2 transition-all cursor-col-resize z-10 bg-slate-200 items-center justify-center group ${isDragging ? 'bg-blue-500 w-2' : ''}`}
                >
                    <div className="w-0.5 h-8 bg-slate-400 rounded-full group-hover:bg-white" />
                </div>

                {/* Right Panel: Chat & History */}
                <div
                    ref={rightPanelRef}
                    style={{ width: `${100 - splitRatio}%` }}
                    className="flex bg-white overflow-hidden relative study-panel-right w-full md:w-auto"
                >

                    {/* Chat History Sidebar */}
                    <div className={`${showHistory ? 'w-72 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4'} transition-all duration-300 ease-in-out bg-slate-50 border-r flex flex-col shrink-0 overflow-hidden`}>
                        <div className="p-4 border-b flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                            <h3 className="font-semibold text-slate-700 text-sm">Chat Sessions</h3>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}>
                                <X className="w-4 h-4 text-slate-400" />
                            </Button>
                        </div>

                        <div className="p-3">
                            <Button
                                className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                                onClick={() => createSession('New Study Session')}
                            >
                                <Plus className="w-4 h-4" /> New Chat
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {sessions.map(session => (
                                <div
                                    key={session.id}
                                    className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer text-sm transition-all border ${sessionId === session.id
                                        ? 'bg-white border-blue-200 shadow-sm text-blue-700 font-medium'
                                        : 'border-transparent hover:bg-white hover:shadow-sm text-slate-600'
                                        }`}
                                    onClick={() => switchSession(session.id)}
                                >
                                    <MessageSquare className={`w-4 h-4 shrink-0 ${sessionId === session.id ? 'text-blue-500' : 'text-slate-400'}`} />

                                    {editingSessionId === session.id ? (
                                        <div className="flex items-center gap-1 flex-1 min-w-0 animate-in fade-in" onClick={e => e.stopPropagation()}>
                                            <Input
                                                value={editSessionTitle}
                                                onChange={e => setEditSessionTitle(e.target.value)}
                                                className="h-7 text-xs py-1 px-2 border-blue-300 focus:ring-blue-200"
                                                autoFocus
                                                onClick={e => e.stopPropagation()}
                                                onKeyDown={e => {
                                                    e.stopPropagation()
                                                    if (e.key === 'Enter') saveSessionTitle(session.id, e as any)
                                                    if (e.key === 'Escape') cancelEditingSession(e as any)
                                                }}
                                                aria-label="Session Title"
                                            />
                                            <button onClick={(e) => saveSessionTitle(session.id, e)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check className="w-3.5 h-3.5" /></button>
                                            <button onClick={(e) => cancelEditingSession(e)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 truncate">
                                                <p className="truncate">{session.title}</p>
                                                <p className="text-[10px] text-slate-400 font-normal">
                                                    {new Date(session.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                                                <button
                                                    onClick={(e) => startEditingSession(session, e)}
                                                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-md transition-all"
                                                    title="Rename Session"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => deleteSession(session.id, e)}
                                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-all"
                                                    title="Delete Session"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Chat Interface */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white">
                        {/* Chat Header */}
                        <div className="h-14 border-b flex items-center justify-between px-4 bg-white/80 backdrop-blur shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                {!showHistory && (
                                    <Button variant="ghost" size="icon" onClick={() => setShowHistory(true)} className="text-slate-500 hover:text-blue-600">
                                        <History className="w-5 h-5" />
                                    </Button>
                                )}
                                <div>
                                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                        {sessions.find(s => s.id === sessionId)?.title || "Current Session"}
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium">AI Agent</span>
                                    </h2>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
                                {isLoading ? 'Thinking...' : 'Online'}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-slate-50/30">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-500">
                                        <Bot className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-700">StudyMate Assistant</h3>
                                    <p className="text-sm text-slate-500 max-w-xs mt-2">
                                        Ask questions about your {selectedDocuments.length} selected documents or general topics.
                                    </p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-blue-600'}`}>
                                            {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                        </div>
                                        <div className={`flex-1 max-w-[85%] space-y-1 group`}>
                                            <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                                <span className="text-xs font-bold text-slate-700">{msg.role === 'user' ? 'You' : 'StudyMate AI'}</span>
                                                <span className="text-[10px] text-slate-400">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>

                                            {editingMessageId === msg.id ? (
                                                <div className="bg-white p-3 rounded-xl border-2 border-blue-100 shadow-sm">
                                                    <Input
                                                        value={editText}
                                                        onChange={e => setEditText(e.target.value)}
                                                        className="mb-2 bg-slate-50 border-slate-200"
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="ghost" onClick={cancelEditing}>Cancel</Button>
                                                        <Button size="sm" onClick={() => saveEdit(msg.id)}>Save & Ask</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={`text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                                    ? 'text-white bg-blue-600 p-3.5 rounded-2xl rounded-tr-none'
                                                    : 'text-slate-700 bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none markdown-content'
                                                    }`}>
                                                    {msg.role === 'assistant' ? <Markdown>{msg.content}</Markdown> : msg.content}
                                                </div>
                                            )}

                                            {/* Message Actions */}
                                            {msg.role === 'user' && !editingMessageId && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end pt-1">
                                                    <button onClick={() => { setEditText(msg.content); setEditingMessageId(msg.id); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => deleteMessage(msg.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isLoading && (
                                <div className="flex gap-4">
                                    <div className="w-9 h-9 rounded-xl bg-white border flex items-center justify-center shrink-0">
                                        <Bot className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex gap-1.5 shadow-sm items-center">
                                        <span className="text-xs font-medium text-slate-500 mr-2">Thinking</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t">
                            <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder={selectedDocuments.length > 0 ? "Ask about your documents..." : "Ask a general question..."}
                                        className="pr-12 py-3.5 h-auto max-h-32 text-base shadow-sm border-slate-200 bg-slate-50 focus:bg-white transition-all rounded-xl resize-none"
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !isLoading && (e.preventDefault(), handleSend())}
                                        aria-label="Chat Message"
                                    />
                                    <Button
                                        size="icon"
                                        className={`absolute right-1.5 top-1.5 w-9 h-9 transition-all ${message.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-200 text-slate-400'}`}
                                        onClick={handleSend}
                                        disabled={isLoading || !message.trim()}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-center text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-2">
                                {selectedDocuments.length > 0 ? (
                                    <><BookOpen className="w-3 h-3 text-blue-500" /> referencing {selectedDocuments.length} document(s)</>
                                ) : (
                                    "General Knowledge Mode"
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
