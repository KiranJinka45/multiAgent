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

export default function ChatPage({ params }: { params: { id: string } }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
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

    const handleAiGeneration = async (prompt: string, model: string = 'Fast') => {
        setIsGenerating(true);
        try {
            // Optimistic update
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

            // Call API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, model }),
            });

            const data = await response.json();

            if (data.response) {
                const aiMsg: Message = {
                    id: crypto.randomUUID(),
                    chat_id: params.id,
                    content: data.response,
                    role: 'assistant',
                    created_at: new Date().toISOString(),
                };
                setMessages(prev => [...prev, aiMsg]);

                // Save assistant message to DB
                await chatService.addMessage(params.id, data.response, 'assistant');
            } else {
                toast.error("Failed to generate content");
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
    }, [params.id]);

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
                <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

                <div className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-20 pb-40">
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <ChatList messages={messages} onEdit={handleEdit} />
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </div>

                <TaskInput ref={taskInputRef} onAddTask={addMessage} />
            </main>
        </div>
    );
}
