'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@shared/lib/supabaseClient';
import { toast } from 'sonner';
import Sidebar from '@components/Sidebar';
import MobileMenu from '@components/MobileMenu';
import TaskInput, { TaskInputHandle } from '@components/TaskInput';
import ChatList from '@components/ChatList';
import TopNav from '@components/TopNav';
import WelcomeModal from '@components/WelcomeModal';
import { chatService } from '@services/chat-service';
import { projectService } from '@services/project-service';
import { Message } from '@shared-types/chat';

export default function Dashboard() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = getSupabaseClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const taskInputRef = useRef<TaskInputHandle>(null);

    // Handle Remix/Prompt Import
    useEffect(() => {
        const prompt = searchParams.get('prompt');
        if (prompt && taskInputRef.current) {
            taskInputRef.current.setInput(prompt);
            // toast.info("Prompt imported! Ready to remix.");
            // Clean URL
            window.history.replaceState({}, '', '/');
        }
    }, [searchParams]);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast("Authentication Recommended", {
                    description: "Please login to allow you to save your chat progress.",
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

    const handleAiGeneration = useCallback(async (prompt: string, tool?: string) => {
        try {
            // Redirect to Project Editor Workflow for all build/generate requests
            if (tool === 'project' || prompt.toLowerCase().includes('generate app') || prompt.toLowerCase().includes('build a') || prompt.toLowerCase().includes('create a web app') || prompt.toLowerCase().includes('coffee cafe')) {
                const toastId = toast.loading("Checking system health...", { duration: Infinity });

                try {
                    const healthRes = await fetch('/api/system-health');
                    if (healthRes.ok) {
                        const health = await healthRes.json();
                        if (!health.redis || !health.socket) {
                            toast.warning("Infrastructure Initializing", {
                                id: toastId,
                                description: "System is starting up. Build performance may be affected.",
                                duration: 5000
                            });
                        }
                    } else if (healthRes.status === 503) {
                        toast.info("System Booting", {
                            id: toastId,
                            description: "The autonomous grid is warming up. Initiating project room anyway.",
                            duration: 5000
                        });
                    }
                    toast.loading("Initializing MultiAgent Build Environment...", { id: toastId });
                } catch {
                    toast.info("Connecting to Grid...", { id: toastId });
                }

                const { data: project, error } = await projectService.createProject(
                    prompt.substring(0, 30) + (prompt.length > 30 ? "..." : ""),
                    prompt,
                    'web_app'
                );

                if (error || !project) {
                    toast.error("Failed to initialize project room", { id: toastId });
                    console.error("Project creation error:", error);
                    return;
                }

                toast.success("Project Room Ready", { id: toastId });
                router.push(`/projects/${project.id}`);
                return;
            }

            // Image generation handling
            if (tool === 'image') {
                const response = await fetch('/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt }),
                });
                if (response.ok) {
                    const data = await response.json();
                    const { chat } = await chatService.createChat(`Image: ${prompt.substring(0, 30)}`);
                    if (chat) {
                        await chatService.addMessage(chat.id, prompt, 'user');
                        await chatService.addMessage(chat.id, data.response, 'assistant');
                        router.push(`/c/${chat.id}`);
                        return;
                    }
                }
            }

            // Standard Chat/Research -> Create chat and redirect
            const title = prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt;
            const { chat, error } = await chatService.createChat(title);

            if (chat) {
                await chatService.addMessage(chat.id, prompt, 'user');
                router.push(`/c/${chat.id}`);
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    toast.error("Please login to start a chat", {
                        action: { label: "Login", onClick: () => router.push("/login") }
                    });
                } else {
                    toast.error("Failed to start chat session");
                    console.error("Chat creation error:", error);
                }
            }
        } catch (error) {
            console.error("AI Generation error:", error);
            toast.error("Something went wrong");
        }
    }, [router, supabase]);

    const addMessage = useCallback((content: string, tool?: string) => {
        handleAiGeneration(content, tool);
    }, [handleAiGeneration]);

    const handleRegenerate = async (messageId: string) => {
        // Find the assistant message
        const msg = messages.find(m => m.id === messageId);
        if (!msg) return;

        // On the root page, we usually redirect to /c/[id] after first message.
        // If we're still here, we can try to re-run.
        const userPrompt = messages.find(m => m.role === 'user')?.content;
        if (!userPrompt) return;

        setMessages(prev => prev.filter(m => m.id !== messageId));
        await chatService.deleteMessage(messageId);
        handleAiGeneration(userPrompt);
    };

    const handleEdit = (msg: Message) => {
        if (msg.role === 'user') {
            taskInputRef.current?.setInput(msg.content);
            taskInputRef.current?.focus();
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden selection:bg-primary/30">
            <WelcomeModal />
            <Sidebar />
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <main
                style={{ marginLeft: 'var(--sidebar-width, 260px)' }}
                className="flex-1 flex flex-col h-full relative transition-[margin] duration-300 ease-in-out"
            >
                <TopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                {/* Top decorative gradient */}
                <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

                <div className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-20 pb-40">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12 relative">
                                {/* Premium Logo & Greeting */}
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                    <div className="relative inline-block">
                                        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent select-none">
                                            MultiAgent
                                        </h1>
                                    </div>
                                    <p className="text-xl md:text-2xl font-medium text-muted-foreground max-w-lg mx-auto leading-tight">
                                        <span className="block text-primary/80">Build complete software products from a single prompt.</span>
                                    </p>
                                </div>

                                {/* Centered Input with Glassmorphism */}
                                <div className="w-full max-w-2xl relative z-40 animate-in fade-in zoom-in-95 duration-1000 delay-200">
                                    <TaskInput ref={taskInputRef} onAddTask={addMessage} centered={true} />
                                </div>

                                {/* Refined Recommendation Chips */}
                                <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                                    {[
                                        { icon: "🚀", label: "Build a landing page", prompt: "Build a professional landing page for a creative agency" },
                                        { icon: "🎨", label: "Generate an image", prompt: "Create a photorealistic image of a futuristic floating garden" },
                                        { icon: "📊", label: "Analyze data", prompt: "Show me the top tech trends for 2026" },
                                        { icon: "🖥️", label: "Go to Dashboard", action: () => router.push('/dashboard') }
                                    ].map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={item.action ? item.action : () => addMessage(item.prompt!)}
                                            className="group flex items-center gap-2.5 px-5 py-2.5 glass rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-95"
                                        >
                                            <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
                                            {item.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Background Decorative Elements */}
                                <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/5 blur-[100px] rounded-full animate-float" />
                                <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/5 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <ChatList
                                    messages={messages}
                                    onEdit={handleEdit}
                                    onRegenerate={handleRegenerate}
                                />
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </div>

                {messages.length > 0 && <TaskInput ref={taskInputRef} onAddTask={addMessage} />}
            </main >
        </div >
    );
}
