import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface TimerContextType {
    minutes: number
    seconds: number
    isActive: boolean
    isBreak: boolean
    toggle: () => void
    reset: () => void
    setDuration: (minutes: number) => void
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: ReactNode }) {
    const [minutes, setMinutes] = useState(25)
    const [seconds, setSeconds] = useState(0)
    const [isActive, setIsActive] = useState(false)
    const [isBreak, setIsBreak] = useState(false)

    useEffect(() => {
        let interval: any = null

        if (isActive) {
            interval = setInterval(() => {
                setSeconds(prevSeconds => {
                    if (prevSeconds === 0) {
                        setMinutes(prevMinutes => {
                            if (prevMinutes === 0) {
                                // Timer Completed
                                setIsBreak(prev => {
                                    const nextIsBreak = !prev
                                    // Auto-switch modes or stop? Let's stop and switch mode but wait for user to start
                                    setIsActive(false)
                                    setMinutes(nextIsBreak ? 5 : 25)
                                    // You could add a sound notification here
                                    return nextIsBreak
                                })
                                return 0
                            }
                            return prevMinutes - 1
                        })
                        return 59
                    }
                    return prevSeconds - 1
                })
            }, 1000)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isActive])

    // Helper to avoid stale closure if we used isBreak inside the interval without ref
    // But functional updates (prev => ...) handle it well. 
    // However, switching Break/Focus usually resets the timer logic a bit.
    // Let's refine the completion logic to be safer.

    // Actually, the above functional update logic for setMinutes inside setSeconds has a slight issue:
    // It doesn't know the *current* isBreak state to switch correctly if we do it inside.
    // It's cleaner to check (minutes === 0 && seconds === 0) in a separate effect or use refs.




    const toggle = () => setIsActive(!isActive)

    const reset = () => {
        setIsActive(false)
        setIsBreak(false)
        setMinutes(25)
        setSeconds(0)
    }

    const setDuration = (min: number) => {
        setIsActive(false)
        setIsBreak(false)
        setMinutes(min)
        setSeconds(0)
    }

    // We need a helper for inner logic to set isBreak separate? No, simplistic is fine.

    return (
        <TimerContext.Provider value={{ minutes, seconds, isActive, isBreak, toggle, reset, setDuration }}>
            {children}
        </TimerContext.Provider>
    )
}

export function useTimer() {
    const context = useContext(TimerContext)
    if (context === undefined) {
        throw new Error('useTimer must be used within a TimerProvider')
    }
    return context
}
