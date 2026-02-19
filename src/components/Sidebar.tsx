'use client';

import { LucideIcon, LayoutDashboard, ListTodo, CheckSquare, Settings, MessageSquare, LogOut, MoreHorizontal, Share2, Users, Edit3, Pin, Archive, Trash2, Sparkles, PanelLeft, ChevronDown, Image, LayoutGrid, Compass, Box, FolderPlus, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { chatService } from '@/lib/chat-service';
import { Chat } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '@/context/SidebarContext';

type SidebarItemProps = {
    icon: LucideIcon;
    label: string;
    href: string;
    active?: boolean;
};

const SidebarItem = ({ icon: Icon, label, href, active }: SidebarItemProps) => (
    <Link
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-300 group ${active
            ? 'bg-accent text-foreground'
            : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
            }`}
    >
        <Icon size={16} className={active ? 'text-primary' : 'group-hover:text-foreground transition-colors duration-300'} />
        <span className="font-medium text-[13px] tracking-tight">{label}</span>
    </Link>
);

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [chats, setChats] = useState<Chat[]>([]);
    const [user, setUser] = useState<any>(null);
    const { isCollapsed, setIsCollapsed, width, setWidth } = useSidebar();
    const [isResizing, setIsResizing] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const supabase = createClientComponentClient();

    const fetchChats = async () => {
        if (!user) return;
        const data = await chatService.getChats();
        setChats(data);
    };

    // Resizing logic
    const startResizing = useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = e.clientX;
            if (newWidth > 200 && newWidth < 480) {
                setWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    // Handle outside clicks for context menu
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

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


    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    // Handle outside clicks for profile menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this mission?')) {
            const success = await chatService.deleteChat(id);
            if (success) {
                setChats(prev => prev.filter(c => c.id !== id));
                if (pathname === `/c/${id}`) router.push('/');
            }
        }
        setActiveMenu(null);
    };

    const handleNewMission = () => {
        router.push('/');
    };

    return (
        <>

            <aside
                ref={sidebarRef}
                style={{ width: isCollapsed ? 0 : width }}
                className={`fixed left-0 top-0 h-screen bg-background/95 backdrop-blur-xl border-r border-border flex flex-col z-50 transition-[width] duration-300 ease-in-out ${isCollapsed ? '-translate-x-full overflow-hidden' : 'translate-x-0'} group/sidebar`}
            >
                {/* Resize Handle */}
                <div
                    onMouseDown={startResizing}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize group/resizer z-50 transition-colors"
                >
                    <div className="absolute inset-y-0 right-[4px] w-[1px] bg-border group-hover/resizer:bg-primary transition-colors h-full" />
                </div>

                <div className="p-4 h-full flex flex-col min-w-[260px]">
                    {/* Sidebar Top: Logo + Toggle */}
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                            <Sparkles size={14} className="text-background" />
                        </div>
                        <button
                            onClick={() => setIsCollapsed(true)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                            <PanelLeft size={20} />
                        </button>
                    </div>

                    <div className="mb-4 px-1">
                        <button
                            onClick={handleNewMission}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-accent/40 hover:bg-accent transition-all group whitespace-nowrap overflow-hidden"
                        >
                            <Edit3 size={16} className="text-foreground shrink-0" />
                            <span className="text-[13px] font-medium text-foreground truncate">New chat</span>
                            <span className="ml-auto text-[9px] text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Ctrl+Shift+O</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 px-1">
                        <div>
                            <nav className="space-y-0.5">
                                <SidebarItem icon={Search} label="Search chats" href="#" />
                                <SidebarItem icon={Image} label="Images" href="#" />
                                <SidebarItem icon={LayoutGrid} label="Apps" href="#" />
                                <SidebarItem icon={Compass} label="Codex" href="#" />
                                <SidebarItem icon={Box} label="GPTs" href="#" />
                                <SidebarItem icon={FolderPlus} label="Projects" href="#" />
                            </nav>
                        </div>

                        <div>
                            <h3 className="px-3 text-[10px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-widest">History</h3>
                            <nav className="space-y-0.5">
                                <SidebarItem
                                    icon={LayoutDashboard}
                                    label="Chat Center"
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
                            <h3 className="px-3 text-[10px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-widest">Chats</h3>
                            <nav className="space-y-0.5">
                                {chats.map((chat) => (
                                    <div key={chat.id} className="relative group/chat">
                                        <Link
                                            href={`/c/${chat.id}`}
                                            className={`flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-lg transition-all pr-8 ${pathname === `/c/${chat.id}`
                                                ? 'text-foreground bg-accent'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
                                                }`}
                                        >
                                            <MessageSquare size={14} className={pathname === `/c/${chat.id}` ? 'text-primary' : 'text-muted-foreground group-hover/chat:text-foreground'} />
                                            <span className="truncate">{chat.title}</span>
                                        </Link>

                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setActiveMenu(activeMenu === chat.id ? null : chat.id);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted opacity-0 group-hover/chat:opacity-100 transition-opacity"
                                        >
                                            <MoreHorizontal size={14} />
                                        </button>

                                        {/* Context Menu */}
                                        <AnimatePresence>
                                            {activeMenu === chat.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                                    className="absolute left-full top-0 ml-2 w-48 bg-card border border-border rounded-xl shadow-xl z-[100] p-1.5"
                                                >
                                                    <div className="space-y-0.5">
                                                        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent text-sm text-foreground transition-colors">
                                                            <Share2 size={14} /> Share
                                                        </button>
                                                        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent text-sm text-foreground transition-colors">
                                                            <Users size={14} /> Start a group chat
                                                        </button>
                                                        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent text-sm text-foreground transition-colors">
                                                            <Edit3 size={14} /> Rename
                                                        </button>
                                                        <div className="h-px bg-border my-1" />
                                                        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent text-sm text-foreground transition-colors">
                                                            <Pin size={14} /> Pin chat
                                                        </button>
                                                        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent text-sm text-foreground transition-colors">
                                                            <Archive size={14} /> Archive
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteChat(chat.id, e)}
                                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-red-500/10 text-sm text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={14} /> Delete
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                                {chats.length === 0 && (
                                    <div className="px-4 py-2 text-sm text-neutral-600 italic">
                                        {user ? 'No chats yet' : 'Sign in to see history'}
                                    </div>
                                )}
                            </nav>
                        </div>
                    </div>

                    <div className="mt-auto border-t border-border pt-4 relative" ref={profileRef}>
                        {user ? (
                            <>
                                <AnimatePresence>
                                    {isProfileMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full left-0 w-full mb-2 bg-card border border-border rounded-xl shadow-2xl z-[110] p-1.5 overflow-hidden"
                                        >
                                            <div className="space-y-0.5">
                                                <Link href="/strategy" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm text-foreground transition-colors">
                                                    <Sparkles size={16} className="text-primary" /> Strategic Guide
                                                </Link>
                                                <Link href="/settings" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm text-foreground transition-colors">
                                                    <Settings size={16} /> Settings
                                                </Link>
                                                <Link href="/strategy#help" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm text-foreground transition-colors">
                                                    <ListTodo size={16} /> Help & FAQ
                                                </Link>
                                                <div className="h-px bg-border my-1" />
                                                <button
                                                    onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-500 transition-colors"
                                                >
                                                    <LogOut size={16} /> Sign Out
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-accent/20 hover:bg-accent/40 transition-colors cursor-pointer group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shrink-0 capitalize">
                                        {user.user_metadata?.full_name
                                            ? user.user_metadata.full_name.split(' ').map((n: any) => n[0]).join('').substring(0, 2)
                                            : user.email?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-semibold text-foreground truncate tracking-tight">
                                            {user.user_metadata?.full_name || (user.email?.includes('kiranjinkakumar') ? 'Kiran Jinka' : 'User')}
                                        </div>
                                    </div>
                                    <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </>
                        ) : (
                            <Link href="/login" className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-sm font-medium group">
                                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                                <span>Sign In</span>
                            </Link>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
