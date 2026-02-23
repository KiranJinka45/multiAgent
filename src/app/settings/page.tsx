'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, LogOut, Monitor, Shield, Bell, Moon, Sun, Smartphone, Trash2, Check, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import Sidebar from '@/components/Sidebar';
import MobileMenu from '@/components/MobileMenu';
import TopNav from '@/components/TopNav';
import { toast } from 'sonner';
import { chatService } from '@/lib/chat-service';
import { Archive, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Chat } from '@/types/chat';

type SettingsTab = 'profile' | 'appearance' | 'security' | 'notifications' | 'archive';

export default function SettingsPage() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [archivedChats, setArchivedChats] = useState<Chat[]>([]);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
            } else {
                router.push('/login');
            }
        };
        getUser();
    }, [supabase, router]);

    useEffect(() => {
        if (activeTab === 'archive') {
            const fetchArchived = async () => {
                // We'll fetch all and filter client-side for now as getChats returns all sorted
                // A better approach would be a specific query but getChats is cached usually
                const allChats = await chatService.getChats(supabase);
                setArchivedChats(allChats.filter(chat => chat.is_archived));
            };
            fetchArchived();
        }
    }, [activeTab, supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        toast.success("Signed out successfully");
        router.push('/login');
    };

    const handleExportData = () => {
        // Mock export
        const data = JSON.stringify({ user, exportedAt: new Date().toISOString() }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'multiagent-data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Data export started");
    };

    const handleDeleteAccount = () => {
        toast.error("Account deletion is disabled in this demo.", {
            description: "Contact support for assistance."
        });
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
                                <User size={20} className="text-blue-500" />
                                Profile Settings
                            </h2>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-lg shadow-blue-500/20">
                                    {user?.email?.[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-lg font-medium text-foreground">{user?.user_metadata?.full_name || 'User'}</div>
                                    <div className="text-muted-foreground">{user?.email}</div>
                                </div>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg transition-colors"
                            >
                                <LogOut size={18} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
                                <Monitor size={20} className="text-purple-500" />
                                Interface Theme
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'light', label: 'Light', icon: Sun },
                                    { id: 'dark', label: 'Dark', icon: Moon },
                                    { id: 'system', label: 'System', icon: Smartphone },
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${theme === t.id
                                            ? 'bg-primary/10 border-primary/50 text-primary'
                                            : 'bg-accent/50 border-transparent hover:bg-accent text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <t.icon size={24} />
                                        <span className="font-medium">{t.label}</span>
                                        {theme === t.id && <Check size={16} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
                                <Shield size={20} className="text-green-500" />
                                Security & Privacy
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-accent/50 border border-border">
                                    <div>
                                        <div className="font-medium text-foreground">Export Data</div>
                                        <div className="text-sm text-muted-foreground">Download all your chat history</div>
                                    </div>
                                    <button onClick={handleExportData} className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium text-foreground">
                                        Export JSON
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                                    <div>
                                        <div className="font-medium text-destructive">Delete Account</div>
                                        <div className="text-sm text-destructive/80">Permanently remove all data</div>
                                    </div>
                                    <button onClick={handleDeleteAccount} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
                                <Bell size={20} className="text-orange-500" />
                                Notifications
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-accent/50 border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-background border border-border">
                                            <Bell size={16} className="text-foreground" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">Push Notifications</div>
                                            <div className="text-sm text-muted-foreground">Receive updates about your missions</div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" />
                                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'archive':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
                                <Archive size={20} className="text-yellow-500" />
                                Archived Chats
                            </h2>
                            <div className="space-y-2">
                                {archivedChats.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Archive size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>No archived chats found</p>
                                    </div>
                                ) : (
                                    archivedChats.map((chat) => (
                                        <div key={chat.id} className="flex items-center justify-between p-4 rounded-xl bg-accent/50 border border-border hover:bg-accent/80 transition-colors">
                                            <div>
                                                <div className="font-medium text-foreground text-sm">{chat.title}</div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Archived {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        const success = await chatService.toggleArchived(chat.id, false, supabase);
                                                        if (success) {
                                                            setArchivedChats(prev => prev.filter(c => c.id !== chat.id));
                                                            toast.success('Chat unarchived');
                                                        }
                                                    }}
                                                    className="p-2 bg-background border border-border rounded-lg hover:bg-accent text-foreground transition-colors"
                                                    title="Unarchive"
                                                >
                                                    <RotateCcw size={16} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Permanently delete this chat?')) {
                                                            const success = await chatService.deleteChat(chat.id, supabase);
                                                            if (success) {
                                                                setArchivedChats(prev => prev.filter(c => c.id !== chat.id));
                                                                toast.success('Chat deleted');
                                                            }
                                                        }
                                                    }}
                                                    className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                                                    title="Delete permanently"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-blue-500/30">
            <Sidebar />
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <main
                className="flex-1 flex flex-col h-full relative bg-[#050505] transition-[margin] duration-300 ease-in-out"
                style={{ marginLeft: 'var(--sidebar-width, 260px)' }}
            >
                <TopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

                <div className="flex-1 overflow-y-auto w-full">
                    <div className="max-w-4xl mx-auto w-full px-6 py-12">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Settings Navigation */}
                            <div className="w-full md:w-64 space-y-2">
                                <h1 className="text-3xl font-bold mb-8 md:mb-12 px-2">Settings</h1>
                                <nav className="space-y-1">
                                    {[
                                        { id: 'profile', label: 'Profile', icon: User },
                                        { id: 'appearance', label: 'Appearance', icon: Monitor },
                                        { id: 'security', label: 'Security', icon: Shield },
                                        { id: 'notifications', label: 'Notifications', icon: Bell },
                                        { id: 'archive', label: 'Archived Chats', icon: Archive },
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id as SettingsTab)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <item.icon size={18} />
                                            <span className="font-medium">{item.label}</span>
                                            {activeTab === item.id && <ChevronRight size={16} className="ml-auto opacity-50" />}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 min-w-0 md:pt-20">
                                {renderContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
