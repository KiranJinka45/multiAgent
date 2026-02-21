'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, LayoutGrid, MessageSquare, Plus, Sparkles, Moon, Sun, Settings, Compass, Box } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { projectService } from '@/lib/project-service';
import { chatService } from '@/lib/chat-service';
import { Project } from '@/types/project';
import { Chat } from '@/types/chat';

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [projects, setProjects] = useState<Project[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        const [projectsData, chatsData] = await Promise.all([
            projectService.getProjects(),
            chatService.getChats()
        ]);
        if (projectsData) setProjects(projectsData.slice(0, 5));
        if (chatsData) setChats(chatsData.slice(0, 5));
    }, []);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadData();
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen, loadData]);

    const staticActions = [
        { icon: MessageSquare, label: 'New Chat', action: () => router.push('/') },
        { icon: LayoutGrid, label: 'Browse Projects', action: () => router.push('/projects') },
        {
            icon: Plus, label: 'Create New Project', action: () => {
                const name = prompt("Enter project name:");
                if (name) projectService.createProject(name, "Initiated via Command Palette", "application").then(res => {
                    if (res.data) router.push(`/projects/${res.data.id}`);
                });
            }
        },
        { icon: Settings, label: 'Settings', action: () => router.push('/settings') },
    ];

    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    const filteredChats = chats.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));

    const results = [
        ...staticActions.filter(a => a.label.toLowerCase().includes(query.toLowerCase())).map(a => ({ ...a, type: 'action' })),
        ...filteredProjects.map(p => ({ icon: Box, label: p.name, action: () => router.push(`/projects/${p.id}`), type: 'project' })),
        ...filteredChats.map(c => ({ icon: Sparkles, label: c.title, action: () => router.push(`/c/${c.id}`), type: 'chat' }))
    ];

    const handleSelect = (item: any) => {
        item.action();
        setIsOpen(false);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            handleSelect(results[selectedIndex]);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh] px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-[1000] ring-1 ring-primary/20"
                    >
                        <div className="flex items-center px-4 border-b border-border">
                            <Search className="w-5 h-5 text-muted-foreground mr-3" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Type a command or start a mission..."
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }}
                                onKeyDown={onKeyDown}
                                className="w-full py-4 bg-transparent border-none focus:ring-0 text-sm outline-none"
                            />
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/50 rounded-lg text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border/50">
                                <span>Esc</span>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-none">
                            {results.length > 0 ? (
                                <div className="space-y-1">
                                    {results.map((item, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleSelect(item)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${index === selectedIndex ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-accent text-foreground'
                                                }`}
                                        >
                                            <item.icon className="w-4 h-4" />
                                            <span className="text-sm font-medium flex-1">{item.label}</span>
                                            {item.type !== 'action' && (
                                                <span className={`text-[10px] uppercase tracking-tighter font-bold px-2 py-0.5 rounded-full ${index === selectedIndex ? 'bg-white/20' : 'bg-primary/10 text-primary'
                                                    }`}>
                                                    {item.type}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center text-muted-foreground text-sm">
                                    No results found for "{query}"
                                </div>
                            )}
                        </div>

                        <div className="px-4 py-3 bg-accent/30 border-t border-border flex items-center gap-6">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                <span className="p-1 px-1.5 bg-background rounded border border-border">↑↓</span>
                                <span>Navigate</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                <span className="p-1 px-1.5 bg-background rounded border border-border">Enter</span>
                                <span>Select</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
