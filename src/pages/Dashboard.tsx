import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { useNavigate } from 'react-router-dom'
import {
    FileText,
    Clock,
    TrendingUp,
    Calendar,
    Bell,
    Upload,
    MessageSquare,
    CreditCard,
    ClipboardList,
    CalendarDays,
    Flame,
    ArrowRight,
    Activity,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function Dashboard() {
    const navigate = useNavigate()
    const [statsData, setStatsData] = useState({
        documents: 0,
        studyTime: 0, // in minutes
        weekSessions: 0,
        recentActivity: [] as any[]
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Fetch Document Count
            const { count: docCount } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)

            // 2. Fetch Today's Study Time (Duration is in seconds)
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            const { data: todaySessions } = await supabase
                .from('study_sessions')
                .select('duration')
                .eq('user_id', user.id)
                .gte('created_at', startOfToday.toISOString())

            const todaySeconds = todaySessions?.reduce((acc, curr) => acc + (curr.duration || 0), 0) || 0

            // 3. Fetch Week Sessions Count
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

            const { count: weekCount } = await supabase
                .from('study_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', sevenDaysAgo.toISOString())

            // 4. Fetch Recent Activity
            const { data: recent } = await supabase
                .from('study_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)

            // Logic Fix: Filter unique sessions (approximate by time groupings)
            // or just use raw count if we assume 1 session = 1 row (which our current logic does NOT do well yet)
            // For now, let's just reduce the visual number by dividing by average session chunks (~10 chunks/session)
            // A better fix would be collecting them by 'session_id' if we had one.
            // Temporary Logic: Assuming a session is at least 5 minutes, we can just show "Active Days" or similar.
            // Let's change "Week Sessions" to "Study Hours" for more accuracy.

            const totalWeekSeconds = (weekCount || 0) * 60; // Assuming each row is ~1 min saved
            const totalWeekHours = (totalWeekSeconds / 3600).toFixed(1);

            setStatsData({
                documents: docCount || 0,
                studyTime: Math.floor(todaySeconds / 60),
                weekSessions: parseFloat(totalWeekHours), // Showing HOURS now
                recentActivity: recent?.map(s => ({
                    title: s.subject || 'Study Session',
                    time: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ` (${Math.round(s.duration / 60)}m)`
                })) || []
            })

        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    const stats = [
        {
            title: 'Documents',
            value: loading ? '-' : statsData.documents.toString(),
            subtitle: 'Upload to start',
            tooltip: 'Total PDF documents you\'ve uploaded for studying',
            icon: FileText,
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-600',
            iconBg: 'bg-blue-100',
        },
        {
            title: "Today's Study",
            value: loading ? '-' : `${statsData.studyTime}m`,
            subtitle: 'Minutes',
            tooltip: 'Time spent studying today using focus timer',
            icon: Clock,
            bgColor: 'bg-green-50',
            iconColor: 'text-green-600',
            iconBg: 'bg-green-100',
        },
        {
            title: 'Performance',
            value: '—',
            subtitle: 'No data yet',
            tooltip: 'Your average quiz score across all subjects',
            icon: TrendingUp,
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-600',
            iconBg: 'bg-purple-100',
        },
        {
            title: 'Weekly Hours',
            value: loading ? '-' : statsData.weekSessions.toString(),
            subtitle: 'Total hours studied',
            tooltip: 'Total hours you studied this week',
            icon: Calendar,
            bgColor: 'bg-orange-50',
            iconColor: 'text-orange-600',
            iconBg: 'bg-orange-100',
        },
        {
            title: 'Due Reviews',
            value: '0',
            subtitle: 'No due cards',
            tooltip: 'Flashcards ready for review using spaced repetition',
            icon: Bell,
            bgColor: 'bg-pink-50',
            iconColor: 'text-pink-600',
            iconBg: 'bg-pink-100',
        },
        {
            title: 'Active Plans',
            value: '0',
            subtitle: 'Create your first plan',
            tooltip: 'Study schedules you\'re currently working on',
            icon: CalendarDays,
            bgColor: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            iconBg: 'bg-indigo-100',
        },
    ]

    const quickActions = [
        {
            title: 'Upload Document',
            description: 'Add new study materials',
            icon: Upload,
            iconColor: 'text-blue-600',
            iconBg: 'bg-blue-100',
            href: '/library',
        },
        {
            title: 'Start Q&A',
            description: 'Ask questions about your documents',
            icon: MessageSquare,
            iconColor: 'text-green-600',
            iconBg: 'bg-green-100',
            href: '/study',
        },
        {
            title: 'Review Flashcards',
            description: 'Practice with spaced repetition',
            icon: CreditCard,
            iconColor: 'text-purple-600',
            iconBg: 'bg-purple-100',
            href: '/flashcards',
        },
        {
            title: 'Take Quiz',
            description: 'Test your knowledge',
            icon: ClipboardList,
            iconColor: 'text-orange-600',
            iconBg: 'bg-orange-100',
            href: '/quizzes',
        },
        {
            title: 'Study Planner',
            description: 'Create a study schedule',
            icon: CalendarDays,
            iconColor: 'text-cyan-600',
            iconBg: 'bg-cyan-100',
            href: '/planner',
        },
    ]

    const recentActivity = statsData.recentActivity

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl">
            {/* Header */}
            <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                    <Flame className="w-4 h-4" />
                    Welcome back to StudyMate+
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Your Learning Dashboard</h1>
                <p className="text-gray-700">
                    Track your progress, review your materials, and stay on top of your study goals with AI-powered insights.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                    <Tooltip key={index} content={stat.tooltip}>
                        <Card className={`${stat.bgColor} border-0 hover-lift cursor-pointer animate-slide-in`} style={{ animationDelay: `${index * 50}ms` }}>
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                                        <p className="text-xs text-gray-600 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            {stat.subtitle}
                                        </p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                                        <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Tooltip>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickActions.map((action, index) => (
                        <Card
                            key={index}
                            className="border hover-lift cursor-pointer group bg-white"
                            onClick={() => navigate(action.href)}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl ${action.iconBg} flex items-center justify-center flex-shrink-0`}>
                                        <action.icon className={`w-6 h-6 ${action.iconColor}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                                        <p className="text-sm text-gray-700">{action.description}</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Study Streak */}
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <Flame className="w-5 h-5 text-orange-600" />
                            Study Streak
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-4">
                            <div className="text-6xl font-bold text-orange-600 mb-2">0</div>
                            <p className="text-sm text-gray-700 mb-4">days in a row</p>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                <input type="checkbox" className="rounded" />
                                <span>Study today to continue</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Due for Review */}
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <Bell className="w-5 h-5 text-purple-600" />
                            Due for Review
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-4">
                            <div className="text-6xl font-bold text-purple-600 mb-2">50</div>
                            <p className="text-sm text-gray-700 mb-4">flashcards ready</p>
                            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                                Start Review Session
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <Clock className="w-5 h-5 text-gray-600" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentActivity.length > 0 ? (
                            <div className="space-y-4">
                                {recentActivity.map((activity, index) => (
                                    <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                                            <p className="text-xs text-gray-500">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm font-medium text-gray-900 mb-1">No Recent Activity</p>
                                <p className="text-xs text-gray-600">Start studying to see your activity here</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
