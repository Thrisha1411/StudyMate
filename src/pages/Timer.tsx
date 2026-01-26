import { useTimer } from '@/context/TimerContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Timer as TimerIcon, Play, Pause, RotateCcw, Coffee } from 'lucide-react'

export function Timer() {
    const { minutes, seconds, isActive, isBreak, toggle, reset, setDuration } = useTimer()

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">Focus Timer</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Use the Pomodoro technique to maintain focus and track your study sessions
                </p>
            </div>

            {/* Timer Card */}
            <div className="max-w-2xl mx-auto">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className="p-12">
                        <div className="text-center space-y-8">
                            {/* Timer Display */}
                            <div>
                                <div className="inline-flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full text-sm font-medium mb-4">
                                    {isBreak ? (
                                        <>
                                            <Coffee className="w-4 h-4 text-orange-600" />
                                            <span className="text-orange-600">Break Time</span>
                                        </>
                                    ) : (
                                        <>
                                            <TimerIcon className="w-4 h-4 text-green-600" />
                                            <span className="text-green-600">Focus Session</span>
                                        </>
                                    )}
                                </div>
                                <div className="text-8xl font-bold mb-2">
                                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                                </div>
                                <p className="text-muted-foreground">
                                    {isBreak ? 'Take a short break' : 'Stay focused on your task'}
                                </p>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-4">
                                <Button
                                    size="lg"
                                    onClick={toggle}
                                    className="w-32 gap-2"
                                >
                                    {isActive ? (
                                        <>
                                            <Pause className="w-5 h-5" />
                                            Pause
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-5 h-5" />
                                            Start
                                        </>
                                    )}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={reset}
                                    className="w-32 gap-2"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    Reset
                                </Button>
                            </div>

                            {/* Preset Durations */}
                            <div className="pt-6 border-t">
                                <p className="text-sm font-medium mb-3">Quick Presets</p>
                                <div className="flex gap-2 justify-center">
                                    {[15, 25, 45, 60].map((min) => (
                                        <button
                                            key={min}
                                            onClick={() => setDuration(min)}
                                            className="px-4 py-2 rounded-lg border-2 border-input hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium"
                                        >
                                            {min}m
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stats */}
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6 text-center">

                        <div className="text-sm text-muted-foreground">Sessions Today</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 text-center">

                        <div className="text-sm text-muted-foreground">Total Focus Time</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 text-center">

                        <div className="text-sm text-muted-foreground">Day Streak</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
