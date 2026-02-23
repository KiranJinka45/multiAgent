'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, Sparkles, ListTodo, ChevronDown, Github } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Auth helpers import (unused)

import { type SupabaseClient, type User } from '@supabase/auth-helpers-nextjs';

type SidebarProfileProps = {
    user: User | null;
    supabase: SupabaseClient;
};

export const SidebarProfile = ({ user, supabase }: SidebarProfileProps) => {
    const { isGithubConnected } = useSidebar();
    const [isOpen, setIsOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    if (!user) {
        return (
            <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-sm font-semibold group">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-all">
                    <LogOut size={18} />
                </div>
                <span>Sign In</span>
            </Link>
        );
    }

    const initials = user?.user_metadata?.full_name
        ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
        : user?.email?.[0] || 'U';

    const displayName = user.user_metadata?.full_name || (user.email?.includes('kiranjinkakumar') ? 'Kiran Jinka' : 'User');

    return (
        <div className="relative pt-4 border-t border-border" ref={profileRef}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 w-full mb-3 glass-card rounded-2xl shadow-2xl z-[110] p-1.5 overflow-hidden"
                    >
                        <div className="space-y-0.5">
                            <Link href="/strategy" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-primary/10 hover:text-primary text-sm font-semibold transition-all">
                                <Sparkles size={16} /> Strategic Guide
                            </Link>
                            <Link href="/settings" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent text-sm font-semibold text-foreground transition-all">
                                <Settings size={16} /> Settings
                            </Link>
                            <Link href="/strategy#help" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent text-sm font-semibold text-foreground transition-all">
                                <ListTodo size={16} /> Help & FAQ
                            </Link>
                            <div className="h-px bg-border my-1.5 mx-2" />
                            <button
                                onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-500/10 text-sm font-bold text-red-500 transition-all"
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all cursor-pointer group hover:bg-accent/40 ${isOpen ? 'bg-accent/60' : 'bg-accent/20'}`}
            >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary via-purple-500 to-blue-600 flex items-center justify-center text-xs font-black text-white shadow-xl shrink-0 capitalize border border-white/20">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground truncate tracking-tight">
                        {displayName}
                    </div>
                    {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_') ? (
                        <div className="text-[10px] text-red-400 truncate uppercase tracking-widest font-black opacity-80 animate-pulse">
                            STRIPE KEY ERROR
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate uppercase tracking-widest font-black opacity-60">
                            {isGithubConnected && <Github size={10} className="text-primary" />}
                            Pro Member
                        </div>
                    )}
                </div>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
        </div>
    );
};
