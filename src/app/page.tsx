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
import { chatService } from '@/lib/chat-service';
import { Message } from '@/types/chat';

export default function Dashboard() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

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
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4 relative">
                                {/* Custom MultiAgent Doodle */}
                                <div className="mb-4 relative py-6 px-4 group">
                                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter flex items-center justify-center select-none">
                                        {/* Stylized M */}
                                        <span className="text-blue-500 animate-in slide-in-from-left-8 duration-700">M</span>
                                        {/* Stylized u with pulse */}
                                        <span className="text-red-400 relative">u
                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping opacity-75"></span>
                                        </span>
                                        {/* Animated lti */}
                                        <span className="text-yellow-400 bg-gradient-to-b from-yellow-400 to-orange-500 bg-clip-text">lti</span>
                                        {/* Agent with dynamic underline */}
                                        <span className="relative text-green-400 bg-gradient-to-r from-green-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
                                            Agent
                                            <span className="absolute -bottom-2 left-0 w-0 h-1.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-700 group-hover:w-full" />
                                        </span>
                                    </h1>

                                    {/* Ornamental elements mimicking doodle style */}
                                    <div className="absolute -top-2 -right-8 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full" />
                                    <div className="absolute -bottom-4 -left-12 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />

                                    <div className="mt-3 text-lg md:text-xl font-semibold text-muted-foreground/80 tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                                        Where should we start?
                                    </div>
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

            <Canvas
                isOpen={isCanvasOpen}
                onClose={() => setIsCanvasOpen(false)}
                isGenerating={isGenerating}
                {...canvasData}
            />
        </div>
    );
}
