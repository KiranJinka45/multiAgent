'use client';

import { Sparkles, PanelLeft, Edit3, FolderPlus, Image, Github, Terminal, Compass } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { useRealtimeSubscription } from '@libs/utils';
import type { User } from '@libs/supabase';
import { chatService } from '@libs/utils';
import { Chat } from '@libs/contracts';
import { useSidebar } from '@libs/context';
import { toast } from 'sonner';

// Sub-components
import { SidebarItem } from './sidebar/SidebarItem';
import { SidebarChatList } from './sidebar/SidebarChatList';
import { SidebarProfile } from './sidebar/SidebarProfile';

// Original modals (keeping for now to avoid too many new files)
import GithubIntegrationModal from './GithubIntegrationModal';
import RenameModal from './RenameModal';
import ShareModal from './ShareModal';
import GroupChatModal from './GroupChatModal';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [chats, setChats] = useState<Chat[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const { isCollapsed, setIsCollapsed, width, setWidth, isGithubModalOpen, setIsGithubModalOpen, isGithubConnected } = useSidebar();
    const [isResizing, setIsResizing] = useState(false);

    // Modals state
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

    const sidebarRef = useRef<HTMLDivElement>(null);
    

    const fetchChats = useCallback(async () => {
        if (!user) return;
        const data = await chatService.getChats(supabase);
        setChats(data);
    }, [user]);

    // Resizing logic
    const startResizing = useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    }, []);

    const stopResizing = useCallback(() => setIsResizing(false), []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = e.clientX;
            if (newWidth > 200 && newWidth < 480) setWidth(newWidth);
        }
    }, [isResizing, setWidth]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchChats();
    }, [user, fetchChats]);

    useRealtimeSubscription('sidebar-sync', {
        event: '*',
        schema: 'public',
        table: 'chats'
    }, () => {
        if (user) fetchChats();
    });

    // Handlers
    const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (confirm('Delete this chat permanently?')) {
            const success = await chatService.deleteChat(id, supabase);
            if (success) {
                setChats(prev => prev.filter(c => c.id !== id));
                if (pathname === `/c/${id}`) router.push('/');
                toast.success('Chat deleted');
            }
        }
    };

    const handleTogglePin = async (chat: Chat, e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const success = await chatService.togglePinned(chat.id, !chat.is_pinned, supabase);
        if (success) {
            fetchChats();
            toast.success(chat.is_pinned ? 'Unpinned' : 'Pinned');
        }
    };

    const handleToggleArchive = async (chat: Chat, e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const success = await chatService.toggleArchived(chat.id, !chat.is_archived, supabase);
        if (success) {
            fetchChats();
            toast.success(chat.is_archived ? 'Restored' : 'Archived');
        }
    };

    return (
        <>
            <aside
                ref={sidebarRef}
                style={{ width: isCollapsed ? 64 : width }}
                className={`fixed left-0 top-0 h-screen glass border-r border-border/50 flex flex-col z-50 transition-[width] duration-300 ease-in-out translate-x-0`}
            >
                {/* Resize Handle - only show if not collapsed */}
                {!isCollapsed && (
                    <div onMouseDown={startResizing} className="absolute right-0 top-0 h-full w-1 cursor-col-resize group z-50">
                        <div className="absolute inset-y-0 right-0 w-[1px] bg-border/50 group-hover:bg-primary transition-colors h-full" />
                    </div>
                )}

                <div className={`p-4 h-full flex flex-col ${isCollapsed ? 'items-center' : 'min-w-[260px]'}`}>
                    {/* Header */}
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-8 px-2 w-full`}>
                        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/')}>
                            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center glow-primary rotate-3 group-hover:rotate-0 transition-all duration-500">
                                <Sparkles size={22} className="text-primary-foreground" />
                            </div>
                            {!isCollapsed && <span className="font-black text-xl tracking-tighter bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">MultiAgent</span>}
                        </div>
                        {!isCollapsed && (
                            <button
                                onClick={() => setIsCollapsed(true)}
                                className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                            >
                                <PanelLeft size={20} />
                            </button>
                        )}
                    </div>

                    {/* New Chat Button */}
                    <div className="mb-6 px-1 w-full">
                        <button
                            onClick={() => router.push('/')}
                            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3 px-4 py-3 rounded-2xl bg-foreground text-background hover:opacity-90 transition-all group shadow-xl shadow-foreground/10 active:scale-95 w-full`}
                        >
                            <div className="flex items-center gap-3">
                                <Edit3 size={18} />
                                {!isCollapsed && <span className="text-sm font-bold tracking-tight">New Mission</span>}
                            </div>
                            {!isCollapsed && (
                                <div className="text-[10px] font-black opacity-40 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <span className="px-1 border border-current rounded">Ctrl</span>
                                    <span className="px-1 border border-current rounded">K</span>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className={`mb-8 px-1 space-y-1 ${isCollapsed ? '' : 'glass p-4 rounded-3xl border-border/20 shadow-lg'} w-full`}>
                        <SidebarItem
                            icon={Github}
                            label={isCollapsed ? "" : "GitHub Integration"}
                            href="#"
                            onClick={() => setIsGithubModalOpen(true)}
                            badge={isGithubConnected ? (
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                            ) : null}
                        />
                        <SidebarItem icon={FolderPlus} label={isCollapsed ? "" : "Missions"} href="/projects" active={pathname === '/projects'} />
                        <SidebarItem icon={Compass} label={isCollapsed ? "" : "Showcase"} href="/explore" active={pathname === '/explore'} />
                        <SidebarItem icon={Terminal} label={isCollapsed ? "" : "Control Plane"} href="/dashboard" active={pathname === '/dashboard'} />
                        <SidebarItem icon={Image} label={isCollapsed ? "" : "History"} href="/images" active={pathname === '/images'} />
                    </div>

                    {/* Chat History - only show if not collapsed */}
                    {!isCollapsed && (
                        <SidebarChatList
                            chats={chats}
                            pathname={pathname}
                            onDelete={handleDeleteChat}
                            onTogglePin={handleTogglePin}
                            onToggleArchive={handleToggleArchive}
                            onRename={(chat) => { setSelectedChat(chat); setIsRenameModalOpen(true); }}
                            onShare={(chat) => { setSelectedChat(chat); setIsShareModalOpen(true); }}
                            onGroupChat={(chat) => { setSelectedChat(chat); setIsGroupModalOpen(true); }}
                        />
                    )}

                    {/* Footer / Profile */}
                    <SidebarProfile user={user} supabase={supabase} hideLabels={isCollapsed} />
                </div>
            </aside>

            {/* Modals */}
            <GithubIntegrationModal isOpen={isGithubModalOpen} onClose={() => setIsGithubModalOpen(false)} />
            <RenameModal
                isOpen={isRenameModalOpen}
                onClose={() => setIsRenameModalOpen(false)}
                onRename={async (title) => {
                    if (selectedChat) {
                        const success = await chatService.updateChatTitle(selectedChat.id, title);
                        if (success) { fetchChats(); toast.success('Renamed'); }
                    }
                }}
                initialTitle={selectedChat?.title || ''}
            />
            {selectedChat && (
                <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} chat={selectedChat} />
            )}
            <GroupChatModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                onCreateGroup={async (name, members) => {
                    const { chat } = await chatService.createChat(name);
                    if (chat) {
                        await chatService.addMessage(chat.id, `Group created: ${members.join(', ')}`, 'assistant');
                        fetchChats(); router.push(`/c/${chat.id}`);
                    }
                }}
            />
        </>
    );
}

