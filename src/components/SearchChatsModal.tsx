'use client';

import { Search, X, MessageSquare, Edit3, Calendar, Clock, History, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Chat } from '@/types/chat';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isToday, isWithinInterval, subDays, startOfDay } from 'date-fns';

type SearchChatsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    chats: Chat[];
};

export default function SearchChatsModal({ isOpen, onClose, chats }: SearchChatsModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
            setSearchQuery('');
        }
    }, [isOpen]);

    useEffect(() => {
        const filtered = chats.filter(chat =>
            !chat.is_archived && chat.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredChats(filtered);
    }, [searchQuery, chats]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (!isOpen) {
                    // This would need to be handled by the parent or a global trigger
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isOpen]);

    const groupChats = (chats: Chat[]) => {
        const now = new Date();
        const groups: { [key: string]: Chat[] } = {
            'Today': [],
            'Previous 7 Days': [],
            'Previous 30 Days': [],
            'Older': []
        };

        chats.forEach(chat => {
            const date = new Date(chat.updated_at || chat.created_at);
            if (isToday(date)) {
                groups['Today'].push(chat);
            } else if (isWithinInterval(date, { start: startOfDay(subDays(now, 7)), end: now })) {
                groups['Previous 7 Days'].push(chat);
            } else if (isWithinInterval(date, { start: startOfDay(subDays(now, 30)), end: now })) {
                groups['Previous 30 Days'].push(chat);
            } else {
                groups['Older'].push(chat);
            }
        });

        return groups;
    };

    const groupedChats = groupChats(filteredChats);

    const handleNewChat = () => {
        router.push('/');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[70vh]"
                >
                    {/* Search Input */}
                    <div className="p-4 border-b border-border flex items-center gap-3">
                        <Search size={20} className="text-muted-foreground" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-base"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="p-1 hover:bg-accent rounded-full text-muted-foreground transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border transition-colors hidden sm:block"
                        >
                            Esc
                        </button>
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {/* New Chat Shortcut */}
                        <div className="mb-2">
                            <button
                                onClick={handleNewChat}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-all group text-left"
                            >
                                <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Edit3 size={18} />
                                </div>
                                <span className="text-[14px] font-medium text-foreground">New chat</span>
                            </button>
                        </div>

                        {Object.entries(groupedChats).map(([group, chats]) => (
                            chats.length > 0 && (
                                <div key={group} className="mb-4">
                                    <h3 className="px-3 py-2 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2">
                                        {group === 'Today' && <Clock size={12} />}
                                        {group === 'Previous 7 Days' && <Calendar size={12} />}
                                        {group === 'Previous 30 Days' && <History size={12} />}
                                        {group}
                                    </h3>
                                    <div className="space-y-1">
                                        {chats.map((chat) => (
                                            <Link
                                                key={chat.id}
                                                href={`/c/${chat.id}`}
                                                onClick={onClose}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                                                    <MessageSquare size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        {chat.is_pinned && <Pin size={12} className="text-primary fill-primary shrink-0" />}
                                                        <div className="text-[14px] font-medium text-foreground truncate">{chat.title}</div>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {format(new Date(chat.updated_at || chat.created_at), 'MMM d, h:mm a')}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}

                        {filteredChats.length === 0 && searchQuery && (
                            <div className="py-12 text-center">
                                <Search size={40} className="mx-auto text-muted-foreground/20 mb-3" />
                                <p className="text-muted-foreground text-sm">No chats found for "{searchQuery}"</p>
                            </div>
                        )}

                        {chats.length === 0 && !searchQuery && (
                            <div className="py-12 text-center text-muted-foreground text-sm">
                                Your chat history will appear here
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-border bg-accent/10 flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5"><span className="px-1 py-0.5 rounded bg-card border border-border font-mono">↑↓</span> Navigate</span>
                            <span className="flex items-center gap-1.5"><span className="px-1 py-0.5 rounded bg-card border border-border font-mono">Enter</span> Select</span>
                        </div>
                        <span className="font-medium">MultiAgent Search</span>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
