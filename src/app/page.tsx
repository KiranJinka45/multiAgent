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
import Canvas from '@/components/Canvas';
import AionGeneratorView from '@/components/AionGeneratorView'; // Added import
import { chatService } from '@/lib/chat-service';
import { Message } from '@/types/chat';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Aion Generator State
    const [isAionGeneratorOpen, setIsAionGeneratorOpen] = useState(false);
    const [aionPrompt, setAionPrompt] = useState('');

    // Canvas State
    const [isCanvasOpen, setIsCanvasOpen] = useState(false);
    const [canvasData, setCanvasData] = useState<{
        title: string;
        content: string;
        contentType: 'code' | 'markdown';
        language?: string;
    }>({ title: '', content: '', contentType: 'markdown' });

    const router = useRouter();
    const supabase = createClientComponentClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const taskInputRef = useRef<TaskInputHandle>(null);

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

    const handleAiGeneration = async (prompt: string, model: string = 'Fast', tool?: string) => {
        setIsGenerating(true);
        try {
            // New Aion Generator Intercept
            if (prompt.toLowerCase().includes('generate app') || prompt.toLowerCase().includes('build a') || prompt.toLowerCase().includes('create a web app')) {
                setAionPrompt(prompt);
                setIsAionGeneratorOpen(true);
                return;
            }

            // 1. Create a new chat
            const title = tool === 'image' ? `Image: ${prompt}` : (prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt);
            const { chat: newChat, error: chatError } = await chatService.createChat(title);

            if (!newChat) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    toast.error("Please login to start a chat", {
                        action: { label: "Login", onClick: () => router.push("/login") }
                    });
                } else {
                    toast.error(`Start chat failed: ${chatError?.message || "Unknown error"}`);
                }
                return;
            }

            // 2. Add user message to DB & State
            await chatService.addMessage(newChat.id, prompt, 'user');
            const userMsg: Message = { id: crypto.randomUUID(), chat_id: newChat.id, content: prompt, role: 'user', created_at: new Date().toISOString() };
            setMessages([userMsg]);

            // 3. Add placeholder assistant msg
            const aiMsgId = crypto.randomUUID();
            const aiMsg: Message = { id: aiMsgId, chat_id: newChat.id, content: '', role: 'assistant', created_at: new Date().toISOString() };
            setMessages(prev => [...prev, aiMsg]);

            // 4. Trigger tool-specific or standard AI response
            let endpoint = '/api/chat';
            if (tool === 'image') endpoint = '/api/generate-image';
            else if (tool === 'research') endpoint = '/api/deep-research';
            else if (tool === 'learning') endpoint = '/api/guided-learning';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, prompt, model }),
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            if (tool === 'image') {
                const data = await response.json();
                if (data.response) {
                    setMessages(prev =>
                        prev.map(msg => msg.id === aiMsgId ? { ...msg, content: data.response } : msg)
                    );
                    await chatService.addMessage(newChat.id, data.response, 'assistant');
                    setTimeout(() => router.push(`/c/${newChat.id}`), 1000);
                }
            } else {
                const reader = response.body?.getReader();
                if (!reader) throw new Error('No reader available');
                const textDecoder = new TextDecoder();
                let fullResponse = '';
                let isCanvasDetected = false;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = textDecoder.decode(value, { stream: true });
                    fullResponse += chunk;

                    // Early Canvas detection
                    if (!isCanvasDetected && fullResponse.includes('```')) {
                        isCanvasDetected = true;
                        setIsCanvasOpen(true);
                    }

                    // Strict redundancy fix: Strip ALL code blocks for chat display
                    let chatDisplayContent = fullResponse;
                    if (isCanvasDetected) {
                        chatDisplayContent = fullResponse.replace(/```[\s\S]*$/, '\n\n> **[View Code in Canvas]**');

                        const codeMatch = fullResponse.match(/```(\w+)?\n([\s\S]*?)(?:```|$)/);
                        if (codeMatch) {
                            setCanvasData(prev => ({
                                ...prev,
                                title: "Generated Code",
                                content: codeMatch[2],
                                contentType: 'code',
                                language: codeMatch[1] || 'typescript'
                            }));
                        }
                    }

                    setMessages(prev =>
                        prev.map(msg => msg.id === aiMsgId ? { ...msg, content: chatDisplayContent } : msg)
                    );
                }

                if (fullResponse) {
                    await chatService.addMessage(newChat.id, fullResponse, 'assistant');

                    // Sync Canvas one last time
                    if (fullResponse.includes('```')) {
                        const codeBlockMatch = fullResponse.match(/```(\w+)?\n([\s\S]*?)```/);
                        if (codeBlockMatch) {
                            setCanvasData({
                                title: "Generated Code",
                                content: codeBlockMatch[2],
                                contentType: 'code',
                                language: codeBlockMatch[1] || 'typescript'
                            });
                            setIsCanvasOpen(true);
                        }
                    } else if (fullResponse.length > 800) {
                        setCanvasData({
                            title: "Document",
                            content: fullResponse,
                            contentType: 'markdown'
                        });
                        setIsCanvasOpen(true);
                    }

                    setTimeout(() => router.push(`/c/${newChat.id}`), 500);
                }
            }
        } catch (error) {
            console.error("AI Generation error:", error);
            toast.error("Something went wrong");
        } finally {
            setIsGenerating(false);
        }
    };

    const addMessage = useCallback((content: string, model: string = 'Fast', tool?: string) => {
        handleAiGeneration(content, model, tool);
    }, [router]);

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
            <Sidebar />
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <main
                style={{ marginLeft: 'var(--sidebar-width, 260px)' }}
                className={`flex-1 flex flex-col h-full relative transition-[margin] duration-300 ease-in-out ${isCanvasOpen ? 'md:mr-[30%] xl:mr-[30%]' : ''}`}
            >
                <TopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                {/* Top decorative gradient */}
                <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

                <div className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-20 pb-40">
                        {isAionGeneratorOpen ? (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                                <AionGeneratorView prompt={aionPrompt} onComplete={() => setIsAionGeneratorOpen(false)} />
                            </motion.div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12 relative">
                                {/* Premium Logo & Greeting */}
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                    <div className="relative inline-block">
                                        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                                        <h1 className="text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent select-none">
                                            MultiAgent
                                        </h1>
                                    </div>
                                    <p className="text-xl md:text-2xl font-medium text-muted-foreground max-w-lg mx-auto leading-tight">
                                        The autonomous text-to-app architect.
                                        <span className="block text-primary/80">Where should we build today?</span>
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
                                        { icon: "🐳", label: "Dockerize app", prompt: "Generate a Dockerfile for a React and FastAPI application" }
                                    ].map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => addMessage(item.prompt)}
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

            <Canvas
                isOpen={isCanvasOpen}
                onClose={() => setIsCanvasOpen(false)}
                isGenerating={isGenerating}
                {...canvasData}
            />
        </div >
    );
}
