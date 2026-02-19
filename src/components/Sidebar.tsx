'use client';

import { LucideIcon, LayoutDashboard, ListTodo, CheckSquare, Settings, MessageSquare, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { chatService } from '@/lib/chat-service';
import { Chat } from '@/types/chat';

type SidebarItemProps = {
    icon: LucideIcon;
    label: string;
    href: string;
    active?: boolean;
};

const SidebarItem = ({ icon: Icon, label, href, active }: SidebarItemProps) => (
    <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 group border ${active
            ? 'bg-accent border-border text-foreground shadow-lg shadow-black/5'
            : 'border-transparent hover:bg-accent hover:border-border text-muted-foreground hover:text-foreground'
            }`}
    >
        <Icon size={20} className={active ? 'text-primary' : 'group-hover:text-foreground transition-colors duration-300'} />
        <span className="font-medium text-sm tracking-wide">{label}</span>
        {active && (
            <div className="ml-auto flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse"></div>
            </div>
        )}
    </Link>
);

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [chats, setChats] = useState<Chat[]>([]);
    const [user, setUser] = useState<any>(null);
    const supabase = createClientComponentClient();

    const fetchChats = async () => {
        if (!user) return;
        const data = await chatService.getChats();
        setChats(data);
    };

    useEffect(() => {
        fetchChats();

        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chats',
                },
                (payload) => {
                    fetchChats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, supabase]); // Re-run when user changes

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    const handleNewMission = () => {
        router.push('/');
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-background/95 backdrop-blur-xl border-r border-border p-4 flex flex-col hidden md:flex z-50 transition-colors duration-300">
            <div className="mb-6">
                <button onClick={handleNewMission} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-input hover:bg-accent transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:bg-accent/80 transition-colors">
                        <span className="font-bold text-lg text-foreground">+</span>
                    </div>
                    <div>
                        <span className="block text-sm font-medium text-foreground">New Mission</span>
                        <span className="block text-xs text-muted-foreground">Start fresh orbit</span>
                    </div>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
                <div>
                    <h3 className="px-4 text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Orbit Control</h3>
                    <nav className="space-y-0.5">
                        <SidebarItem
                            icon={LayoutDashboard}
                            label="Mission Center"
                            href="/"
                            active={pathname === '/'}
                        />
                        <SidebarItem
                            icon={ListTodo}
                            label="My Tasks"
                            href="/my-tasks"
                            active={pathname === '/my-tasks'}
                        />
                        <SidebarItem
                            icon={CheckSquare}
                            label="Completed"
                            href="/completed"
                            active={pathname === '/completed'}
                        />
                    </nav>
                </div>

                <div>
                    <h3 className="px-4 text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Chats</h3>
                    <nav className="space-y-0.5">
                        {chats.map((chat) => (
                            <Link
                                key={chat.id}
                                href={`/c/${chat.id}`}
                                className={`block px-4 py-2 text-sm truncate transition-colors ${pathname === `/c/${chat.id}`
                                    ? 'text-white bg-white/5 font-medium'
                                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {chat.title}
                            </Link>
                        ))}
                        {chats.length === 0 && (
                            <div className="px-4 py-2 text-sm text-neutral-600 italic">
                                {user ? 'No chats yet' : 'Sign in to see history'}
                            </div>
                        )}
                    </nav>
                </div>
            </div>

            <div className="mt-auto border-t border-border pt-4 space-y-2">
                <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-sm font-medium group">
                    <Settings transform="grow-20" size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                    <span>Settings</span>
                </Link>

                {user ? (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-accent/50 border border-border">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-500/20">
                            {user.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{user.user_metadata?.full_name || 'User'}</div>
                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                    </div>
                ) : (
                    <Link href="/login" className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-sm font-medium group">
                        <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                        <span>Sign In</span>
                    </Link>
                )}
            </div>
        </aside>
    );
}
