import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Users, Plus, UserPlus } from 'lucide-react'

export function Collaborate() {
    // No default rooms - empty state
    const rooms: any[] = []

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">Group Study</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Collaborate with peers, share documents, and learn together with AI assistance
                </p>
            </div>

            {/* Create/Join Room */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Plus className="w-24 h-24 text-blue-600" />
                    </div>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-white/50 backdrop-blur shadow-sm flex items-center justify-center">
                                <Plus className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Create Study Room</h3>
                                <p className="text-xs text-slate-500">Host a session for your peers</p>
                            </div>
                        </div>

                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Room creation logic coming soon!"); }}>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 ml-1">Room Name</label>
                                <Input placeholder="e.g. Physics Final Prep" className="bg-white/60 border-blue-200 focus:bg-white transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 ml-1">Topic / Subject</label>
                                <Input placeholder="e.g. Quantum Mechanics" className="bg-white/60 border-blue-200 focus:bg-white transition-all" />
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all">
                                Create Room & Invite
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 hover-lift cursor-pointer">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <UserPlus className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Join Existing Room</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Enter a room code to join a study group
                        </p>
                        <div className="flex gap-2">
                            <Input placeholder="Enter room code..." />
                            <Button variant="outline">Join</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Rooms - Empty State */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Your Study Rooms</h2>
                {rooms.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Room cards would go here */}
                    </div>
                ) : (
                    <EmptyState
                        icon={<Users className="w-16 h-16" />}
                        title="No Study Rooms Yet"
                        description="Create a new room or join an existing one to start collaborating with your peers"
                        action={
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Create Your First Room
                            </Button>
                        }
                    />
                )}
            </div>
        </div>
    )
}
