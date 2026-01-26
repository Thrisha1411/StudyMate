import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Plus, CheckCircle2, Circle, Trash2 } from 'lucide-react'

export function Planner() {
    // Mock study plans
    const plans = [
        {
            id: '1',
            title: 'Machine Learning Mastery',
            goalType: 'weekly' as const,
            goalValue: 10,
            startDate: '2026-01-20',
            status: 'active' as const,
            tasks: [
                { id: '1', title: 'Complete Chapter 1-3', completed: true },
                { id: '2', title: 'Practice exercises', completed: true },
                { id: '3', title: 'Review neural networks', completed: false },
                { id: '4', title: 'Take practice quiz', completed: false },
            ],
        },
        {
            id: '2',
            title: 'Data Structures Prep',
            goalType: 'daily' as const,
            goalValue: 2,
            startDate: '2026-01-22',
            status: 'active' as const,
            tasks: [
                { id: '1', title: 'Study trees and graphs', completed: false },
                { id: '2', title: 'Solve 5 problems', completed: false },
            ],
        },
    ]

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">Study Planner</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Organize your study schedule and track your progress towards your goals
                </p>
            </div>

            {/* Create Plan */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-end gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Plan Title</label>
                                <Input placeholder="e.g., Exam Preparation" />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Goal Type</label>
                                <select className="w-full h-10 appearance-none bg-white border border-input rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                    <option>Daily</option>
                                    <option>Weekly</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Hours per {'{period}'}</label>
                                <Input type="number" placeholder="10" />
                            </div>
                        </div>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create Plan
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Active Plans */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Active Plans</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {plans.map((plan) => (
                        <Card key={plan.id} className="hover-lift">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="mb-2">{plan.title}</CardTitle>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            Started {new Date(plan.startDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <Badge variant={plan.status === 'active' ? 'success' : 'secondary'}>
                                        {plan.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Goal Progress */}
                                <div className="mb-4 p-3 bg-secondary rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">
                                            {plan.goalType === 'daily' ? 'Daily' : 'Weekly'} Goal
                                        </span>
                                        <span className="text-sm font-bold">
                                            {plan.goalValue} hours
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-600"
                                            style={{ width: '65%' }}
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        6.5 / {plan.goalValue} hours completed
                                    </div>
                                </div>

                                {/* Tasks */}
                                <div className="space-y-2">
                                    {plan.tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group"
                                        >
                                            <button className="flex-shrink-0">
                                                {task.completed ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                ) : (
                                                    <Circle className="w-5 h-5 text-muted-foreground" />
                                                )}
                                            </button>
                                            <span
                                                className={`flex-1 text-sm ${task.completed ? 'line-through text-muted-foreground' : ''
                                                    }`}
                                            >
                                                {task.title}
                                            </span>
                                            <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Task */}
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex gap-2">
                                        <Input placeholder="Add a new task..." className="text-sm" />
                                        <Button size="sm" variant="outline">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
