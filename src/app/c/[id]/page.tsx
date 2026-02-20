'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { chatService } from '@/lib/chat-service';
import { Message } from '@/types/chat';
import Sidebar from '@/components/Sidebar';
import MobileMenu from '@/components/MobileMenu';
import TopNav from '@/components/TopNav';
import ChatList from '@/components/ChatList';
import TaskInput, { TaskInputHandle } from '@/components/TaskInput';
import Canvas from '@/components/Canvas';

export default function ChatPage({ params }: { params: { id: string } }) {
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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const taskInputRef = useRef<TaskInputHandle>(null); // Add ref
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        const loadMessages = async () => {
            const data = await chatService.getMessages(params.id);
            if (data) setMessages(data);
        };
        loadMessages();
    }, [params.id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleAiGeneration = async (prompt: string, model: string = 'Fast', tool?: string) => {
        setIsGenerating(true);
        try {
            // Optimistic update for user message
            const userMsg: Message = {
                id: crypto.randomUUID(),
                chat_id: params.id,
                content: prompt,
                role: 'user',
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, userMsg]);

            // Save user message to DB
            await chatService.addMessage(params.id, prompt, 'user');

            // Placeholder for AI message
            const aiMsgId = crypto.randomUUID();
            const aiMsg: Message = {
                id: aiMsgId,
                chat_id: params.id,
                content: '',
                role: 'assistant',
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, aiMsg]);

            // Call API
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
                    await chatService.addMessage(params.id, data.response, 'assistant');
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
                        // Aggressively replace the first match of a code block (and everything following)
                        // with a clean notice, while generation is active.
                        chatDisplayContent = fullResponse.replace(/```[\s\S]*$/, '\n\n> **[View Code in Canvas]**');

                        // Sync current code to Canvas
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

                    // Update the placeholder AI message
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === aiMsgId ? { ...msg, content: chatDisplayContent } : msg
                        )
                    );
                }

                // Save final assistant message to DB
                if (fullResponse) {
                    await chatService.addMessage(params.id, fullResponse, 'assistant');

                    // Final check to sync Canvas one last time in case stream ended abruptly
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
    }, [params.id]);

    const handleRegenerate = async (messageId: string) => {
        const index = messages.findIndex(m => m.id === messageId);
        if (index === -1) return;

        // Find the user prompt that preceded this assistant response
        let userPrompt = '';
        for (let i = index - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                userPrompt = messages[i].content;
                break;
            }
        }

        if (!userPrompt) {
            toast.error("Could not find original prompt to regenerate");
            return;
        }

        // Remove the current assistant message from state
        setMessages(prev => prev.filter(m => m.id !== messageId));

        // Remove from DB too for consistency
        await chatService.deleteMessage(messageId);

        // Re-trigger generation
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
                <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

                <div className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-20 pb-40">
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <ChatList
                                messages={messages}
                                onEdit={handleEdit}
                                onRegenerate={handleRegenerate}
                            />
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </div>

                <TaskInput ref={taskInputRef} onAddTask={addMessage} />
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
