'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import MobileMenu from '@/components/MobileMenu';
import TaskInput, { TaskInputHandle } from '@/components/TaskInput';
import ChatList from '@/components/ChatList';
import TopNav from '@/components/TopNav';
import { chatService } from '@/lib/chat-service';
import { Message } from '@/types/chat';

export default function Dashboard() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const router = useRouter();
    const supabase = createClientComponentClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const taskInputRef = useRef<TaskInputHandle>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast("Authentication Recommended", {
                    description: "Please login to allow you to save your mission progress.",
                    action: {
                        label: "Login",
                        onClick: () => router.push("/login")
                    },
                    duration: 8000,
                });
            }
        };
        checkUser();
    }, [supabase, router]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleAiGeneration = async (prompt: string, model: string = 'Fast') => {
        setIsGenerating(true);
        try {
            // 1. Create a new chat
            // Truncate title to first 50 chars or just use prompt
            const title = prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt;
            const { chat: newChat, error: chatError } = await chatService.createChat(title);

            if (!newChat) {
                // Check if it's an auth error (client-side check again for good measure)
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    toast.error("Please login to start a mission", {
                        action: {
                            label: "Login",
                            onClick: () => router.push("/login")
                        }
                    });
                } else {
                    // Show specific DB error to help debugging
                    const errorMessage = chatError?.message || chatError || "Unknown error";
                    toast.error(`Start mission failed: ${errorMessage}. (Check console/migrations)`);
                }
                return;
            }

            // 2. Add user message to DB
            await chatService.addMessage(newChat.id, prompt, 'user');

            // 3. Trigger AI response 
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, model }),
            });

            const data = await response.json();

            if (data.response) {
                // 4. Add assistant message to DB
                await chatService.addMessage(newChat.id, data.response, 'assistant');

                // 5. Redirect to the new chat page
                router.push(`/c/${newChat.id}`);
            } else {
                toast.error(data.error || "Failed to generate content");
            }

        } catch (error) {
            console.error("AI Generation error:", error);
            toast.error("Something went wrong");
        } finally {
            setIsGenerating(false);
        }
    };

    const addMessage = useCallback((content: string, model: string = 'Fast') => {
        handleAiGeneration(content, model);
    }, [router]);

    const handleEdit = (msg: Message) => {
        if (msg.role === 'user') {
            taskInputRef.current?.setInput(msg.content);
            taskInputRef.current?.focus();
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden selection:bg-primary/30">
            <Sidebar />
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <main className="flex-1 flex flex-col h-full relative md:ml-64">
                <TopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                {/* Top decorative gradient */}
                <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

                <div className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-20 pb-40">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 relative">
                                {/* Greeting */}
                                <div className="space-y-2 mb-4">
                                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-accent border border-border text-primary text-xs font-medium">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                        </span>
                                        System Online
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-b from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent tracking-tight">
                                        Hi Kiran
                                    </h1>
                                    <h2 className="text-3xl md:text-4xl font-semibold text-muted-foreground tracking-tight">
                                        Where should we start?
                                    </h2>
                                </div>

                                {/* Centered Input */}
                                <div className="w-full max-w-3xl">
                                    <TaskInput ref={taskInputRef} onAddTask={addMessage} centered={true} />
                                </div>

                                {/* Recommendation Chips */}
                                <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                                    <button onClick={() => addMessage("Create an image of a futuristic city")} className="px-4 py-2 bg-card hover:bg-accent border border-border hover:border-input rounded-full text-sm text-muted-foreground hover:text-foreground transition-all text-left flex items-center gap-2">
                                        <span>🎨</span> Create image
                                    </button>
                                    <button onClick={() => addMessage("Explain quantum computing concepts")} className="px-4 py-2 bg-card hover:bg-accent border border-border hover:border-input rounded-full text-sm text-muted-foreground hover:text-foreground transition-all text-left flex items-center gap-2">
                                        <span>🎓</span> Help me learn
                                    </button>
                                    <button onClick={() => addMessage("Write a python script to parse CSV")} className="px-4 py-2 bg-card hover:bg-accent border border-border hover:border-input rounded-full text-sm text-muted-foreground hover:text-foreground transition-all text-left flex items-center gap-2">
                                        <span>💻</span> Write code
                                    </button>
                                    <button onClick={() => addMessage("Analyze the latest tech trends")} className="px-4 py-2 bg-card hover:bg-accent border border-border hover:border-input rounded-full text-sm text-muted-foreground hover:text-foreground transition-all text-left flex items-center gap-2">
                                        <span>📊</span> Analyze data
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <ChatList messages={messages} onEdit={handleEdit} />
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </div>

                {messages.length > 0 && <TaskInput ref={taskInputRef} onAddTask={addMessage} />}
            </main>
        </div>
    );
}
