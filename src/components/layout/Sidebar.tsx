import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Library,
    MessageSquare,
    CreditCard,
    ClipboardList,
    Timer,
    Calendar,
    Users,
    Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Library', href: '/library', icon: Library },
    { name: 'Study', href: '/study', icon: MessageSquare },
    { name: 'Flashcards', href: '/flashcards', icon: CreditCard },
    { name: 'Quizzes', href: '/quizzes', icon: ClipboardList },
    { name: 'Timer', href: '/timer', icon: Timer },
    { name: 'Planner', href: '/planner', icon: Calendar },
    { name: 'Collaborate', href: '/collaborate', icon: Users },
    { name: 'Profile', href: '/profile', icon: Users },
]

export function Sidebar() {
    return (
        <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">
                            StudyMate+
                        </h1>
                        <p className="text-xs text-gray-500">AI Study Companion</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-3 py-4">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Study Tools
                </p>
                <nav className="space-y-1">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                )
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Footer CTA */}
            <div className="p-4 border-t border-gray-200">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-4 text-center text-white">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">Study Mode</h3>
                    <p className="text-xs opacity-90 mb-3">Ready to learn!</p>
                    <button className="w-full bg-white text-blue-700 text-xs font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">
                        Start Session
                    </button>
                </div>
            </div>
        </div>
    )
}
