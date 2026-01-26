import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTimer } from '@/context/TimerContext'
import { Play, Pause, GripHorizontal } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export function FloatingTimer() {
    const { minutes, seconds, isActive, toggle, isBreak } = useTimer()
    const location = useLocation()
    const [position, setPosition] = useState({ x: window.innerWidth - 220, y: window.innerHeight - 150 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

    // Hide on the actual Timer page to avoid duplication, or if user closed it
    if (location.pathname === '/timer' || !isActive) return null

    // Simple Drag Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        })
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = Math.min(Math.max(0, e.clientX - dragOffset.x), window.innerWidth - 180)
                const newY = Math.min(Math.max(0, e.clientY - dragOffset.y), window.innerHeight - 100)
                setPosition({ x: newX, y: newY })
            }
        }
        const handleMouseUp = () => setIsDragging(false)

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, dragOffset])

    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    return createPortal(
        <div
            className="fixed z-[100] bg-white rounded-2xl shadow-2xl border border-slate-200 w-48 overflow-hidden transition-shadow hover:shadow-xl"
            style={{ left: position.x, top: position.y }}
        >
            {/* Header / Drag Handle */}
            <div
                className={`h-6 ${isBreak ? 'bg-orange-500' : 'bg-blue-600'} flex items-center justify-center cursor-move cursor-grab active:cursor-grabbing`}
                onMouseDown={handleMouseDown}
            >
                <GripHorizontal className="w-4 h-4 text-white/50" />
            </div>

            {/* Content */}
            <div className="p-3 flex items-center justify-between">
                <div>
                    <div className="text-2xl font-bold font-mono leading-none text-slate-800">
                        {formattedTime}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">
                        {isBreak ? 'Break' : 'Focus'}
                    </p>
                </div>

                <button
                    onClick={toggle}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive
                        ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                >
                    {isActive ? <Pause className="fill-current w-4 h-4" /> : <Play className="fill-current w-4 h-4 ml-0.5" />}
                </button>
            </div>
        </div>,
        document.body
    )
}
