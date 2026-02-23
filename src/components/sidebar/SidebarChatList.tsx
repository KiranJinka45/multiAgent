'use client';

import { MessageSquare, Pin, MoreHorizontal, Share2, Users, Edit3, Archive, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chat } from '@/types/chat';

type SidebarChatListProps = {
    chats: Chat[];
    pathname: string;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onTogglePin: (chat: Chat, e: React.MouseEvent) => void;
    onToggleArchive: (chat: Chat, e: React.MouseEvent) => void;
    onRename: (chat: Chat, e: React.MouseEvent) => void;
    onShare: (chat: Chat, e: React.MouseEvent) => void;
    onGroupChat: (chat: Chat, e: React.MouseEvent) => void;
};

export const SidebarChatList = ({
    chats,
    pathname,
    onDelete,
    onTogglePin,
    onToggleArchive,
    onRename,
    onShare,
    onGroupChat
}: SidebarChatListProps) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const sortedChats = chats
        .filter(chat => !chat.is_archived)
        .sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

    return (
        <div className="flex-1 overflow-y-auto space-y-4 px-1 custom-scrollbar">
            <div>
                <h3 className="px-3 text-[10px] font-black text-muted-foreground mb-2.5 uppercase tracking-widest opacity-70">
                    Your History
                </h3>
                <nav className="space-y-1">
                    {sortedChats.map((chat) => (
                        <div key={chat.id} className="relative group/chat">
                            <Link
                                href={`/c/${chat.id}`}
                                className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-xl transition-all pr-8 border border-transparent ${pathname === `/c/${chat.id}`
                                    ? 'text-foreground bg-primary/5 border-primary/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
                                    }`}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <MessageSquare size={14} className={pathname === `/c/${chat.id}` ? 'text-primary' : 'text-muted-foreground opacity-70'} />
                                    <span className={`truncate ${pathname === `/c/${chat.id}` ? 'font-bold' : 'font-medium'}`}>
                                        {chat.title}
                                    </span>
                                </div>
                                {chat.is_pinned && (
                                    <Pin size={10} className="text-primary fill-primary shrink-0 opacity-80" />
                                )}
                            </Link>

                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveMenu(activeMenu === chat.id ? null : chat.id);
                                }}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-accent transition-all ${activeMenu === chat.id ? 'opacity-100 bg-accent' : 'opacity-0 group-hover/chat:opacity-100'
                                    }`}
                            >
                                <MoreHorizontal size={14} />
                            </button>

                            {/* Context Menu */}
                            <AnimatePresence>
                                {activeMenu === chat.id && (
                                    <>
                                        <div className="fixed inset-0 z-[90]" onClick={() => setActiveMenu(null)} />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                            className="absolute right-8 top-0 w-52 glass-card rounded-2xl shadow-2xl z-[100] p-1.5 overflow-hidden"
                                        >
                                            <div className="space-y-0.5">
                                                <button onClick={(e) => { onShare(chat, e); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent text-sm font-semibold transition-all">
                                                    <Share2 size={16} className="text-blue-400" /> Share
                                                </button>
                                                <button onClick={(e) => { onGroupChat(chat, e); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent text-sm font-semibold transition-all">
                                                    <Users size={16} className="text-purple-400" /> Group Chat
                                                </button>
                                                <button onClick={(e) => { onRename(chat, e); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent text-sm font-semibold transition-all">
                                                    <Edit3 size={16} className="text-orange-400" /> Rename
                                                </button>
                                                <div className="h-px bg-border my-1.5 mx-2" />
                                                <button onClick={(e) => { onTogglePin(chat, e); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent text-sm font-semibold transition-all">
                                                    <Pin size={16} className={chat.is_pinned ? 'fill-primary text-primary' : 'text-muted-foreground'} />
                                                    {chat.is_pinned ? 'Unpin' : 'Pin'}
                                                </button>
                                                <button onClick={(e) => { onToggleArchive(chat, e); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent text-sm font-semibold transition-all">
                                                    <Archive size={16} className="text-muted-foreground" /> {chat.is_archived ? 'Unarchive' : 'Archive'}
                                                </button>
                                                <button onClick={(e) => { onDelete(chat.id, e); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-500/10 text-sm font-bold text-red-500 transition-all">
                                                    <Trash2 size={16} /> Delete
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                    {sortedChats.length === 0 && (
                        <div className="px-4 py-8 text-center bg-accent/10 rounded-2xl border border-dashed border-border">
                            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                                No history yet
                            </p>
                        </div>
                    )}
                </nav>
            </div>
        </div>
    );
};
