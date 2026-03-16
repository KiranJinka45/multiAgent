'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
    Mic, MicOff, Image as ImageIcon,
    ChevronDown, Plus, Cpu, Zap, Brain,
    Camera, Files, Library, ArrowUp
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskInputProps {
    onAddTask: (title: string, tool?: string, model?: string) => void;
    placeholder?: string;
    centered?: boolean;
}

export interface TaskInputHandle {
    focus: () => void;
    clear: () => void;
    setInput: (value: string) => void;
}

const TaskInput = forwardRef<TaskInputHandle, TaskInputProps>(({ onAddTask, placeholder = "How can I help you today?", centered = false }, ref) => {
    // Sidebar context (unused)
    const [title, setTitle] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState('Pro');
    const [isFocused, setIsFocused] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => textareaRef.current?.focus(),
        clear: () => setTitle(''),
        setInput: (value: string) => setTitle(value)
    }));

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (title.trim()) {
            let tool = 'general';
            let prompt = title.trim();

            if (title.startsWith('Generate an image: ')) {
                tool = 'image';
                prompt = title.replace('Generate an image: ', '');
            } else if (title.startsWith('Research topic: ')) {
                tool = 'research';
                prompt = title.replace('Research topic: ', '');
            } else if (title.startsWith('Deep Think: ')) {
                tool = 'thinking';
                prompt = title.replace('Deep Think: ', '');
            }

            onAddTask(prompt, tool, selectedModel);
            setTitle('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const target = e.target;
        setTitle(target.value);
        target.style.height = 'auto';
        target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
    };

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsMenuOpen(false);
                setIsModelMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const models = [
        { id: 'Pro', name: 'Pro', icon: Brain, desc: 'Most capable model for complex tasks', color: 'text-purple-400' },
        { id: 'Fast', name: 'Fast', icon: Zap, desc: 'Optimized for speed and efficiency', color: 'text-yellow-400' },
        { id: 'Thinking', name: 'Thinking', icon: Cpu, desc: 'Extended reasoning for deep insights', color: 'text-blue-400' },
    ];

    const currentModelData = models.find(m => m.id === selectedModel) || models[0];

    return (
        <div className={`w-full transition-all duration-300 ${centered ? 'max-w-3xl mx-auto' : 'max-w-4xl mx-auto px-4 md:px-6'}`}>
            <div
                className={`relative transition-all duration-300 rounded-[2rem] bg-foreground/[0.03] border border-white/10 ${isFocused ? 'ring-2 ring-primary/30 shadow-lg' : 'shadow-md'
                    }`}
            >
                {/* Unified Input Bar Area */}
                <div className="flex flex-col p-2">
                    {/* Top Row: Add Button & Input & Mic/Submit */}
                    <div className="flex items-center gap-2">
                        {/* Action Menu (Plus Button) */}
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-all active:scale-95 flex-shrink-0"
                            >
                                <Plus size={20} className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full left-0 mb-3 w-64 glass-card rounded-[1.5rem] shadow-2xl p-2 z-[70] border border-white/10"
                                    >
                                        <div className="space-y-1">
                                            {[
                                                { icon: Camera, label: 'Camera', color: 'text-foreground/80' },
                                                { icon: ImageIcon, label: 'Photos', color: 'text-foreground/80' },
                                                { icon: Files, label: 'Files', color: 'text-foreground/80' },
                                                { icon: Library, label: 'NotebookLLM', color: 'text-foreground/80' },
                                            ].map((item, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setIsMenuOpen(false);
                                                        toast.info(`Selected ${item.label}`);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-foreground/5 transition-all text-sm font-medium"
                                                >
                                                    <item.icon size={18} className={item.color} />
                                                    <span className="text-foreground">{item.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Text Area */}
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={title}
                            onChange={handleInput}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={placeholder}
                            className="flex-1 bg-transparent border-none focus:ring-0 outline-none appearance-none shadow-none text-foreground placeholder:text-muted-foreground/60 resize-none min-h-[44px] max-h-[200px] text-[15px] font-normal tracking-normal leading-relaxed custom-scrollbar scroll-smooth py-2.5 px-2"
                        />

                        {/* Mic & Submit Buttons */}
                        <div className="flex items-center gap-1.5 pr-1">
                            {/* Microphone Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (isRecording) {
                                        setIsRecording(false);
                                    } else {
                                        try {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                                            if (SpeechRecognition) {
                                                const recognition = new SpeechRecognition();
                                                recognition.continuous = false;
                                                // Using final results instead of interim to avoid the rapid "Please try again" errors
                                                recognition.interimResults = false;

                                                recognition.onstart = () => setIsRecording(true);

                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                recognition.onresult = (event: any) => {
                                                    const transcript = Array.from(event.results)
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        .map((result: any) => result[0].transcript)
                                                        .join('');
                                                    setTitle(prev => prev ? prev + ' ' + transcript : transcript);
                                                    if (textareaRef.current) {
                                                        textareaRef.current.style.height = 'auto';
                                                        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
                                                    }
                                                };

                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                recognition.onerror = (event: any) => {
                                                    console.error("Speech recognition error", event.error);
                                                    setIsRecording(false);
                                                    if (event.error === 'not-allowed') {
                                                        toast.error("Microphone access denied. Please allow it in your browser settings.");
                                                    } else if (event.error !== 'no-speech') {
                                                        toast.error(`Microphone error: ${event.error}`);
                                                    }
                                                };

                                                recognition.onend = () => setIsRecording(false);

                                                recognition.start();
                                            } else {
                                                toast.error("Speech recognition is not supported in this browser.");
                                            }
                                        } catch (error) {
                                            console.error("Error initializing mic:", error);
                                            toast.error("Microphone initialization failed.");
                                            setIsRecording(false);
                                        }
                                    }
                                }}
                                className={`p-2.5 rounded-full transition-all active:scale-90 flex-shrink-0 ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                                    }`}
                            >
                                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>

                            {/* Submit Arrow Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSubmit()}
                                disabled={!title.trim()}
                                className={`p-2.5 rounded-full transition-all flex items-center justify-center flex-shrink-0 ${title.trim()
                                    ? 'bg-primary text-primary-foreground shadow-sm hover:opacity-90'
                                    : 'bg-foreground/10 text-foreground/30 hover:bg-foreground/10 cursor-not-allowed'
                                    }`}
                            >
                                <ArrowUp size={20} strokeWidth={2.5} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Bottom Row (Underneath Input): Model Selector */}
                    <div className="flex items-center gap-2 pl-12 pb-1 mt-1">
                        <div className="relative z-[60]">
                            <button
                                type="button"
                                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all active:scale-95 text-[13px] font-medium border border-transparent hover:border-white/5"
                            >
                                <currentModelData.icon size={14} className={currentModelData.color} />
                                <span>{currentModelData.name}</span>
                                <ChevronDown size={14} className={`opacity-50 transition-transform duration-300 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isModelMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full left-0 mb-3 w-64 glass-card rounded-[1.5rem] shadow-xl p-2 z-[60] border border-white/10"
                                    >
                                        <div className="space-y-1">
                                            {models.map((model) => (
                                                <button
                                                    key={model.id}
                                                    onClick={() => { setSelectedModel(model.id); setIsModelMenuOpen(false); }}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedModel === model.id ? 'bg-primary/10' : 'hover:bg-foreground/5'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-lg ${selectedModel === model.id ? 'bg-primary/20' : 'bg-foreground/5'}`}>
                                                        <model.icon size={18} className={model.color} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className={`text-sm font-semibold ${selectedModel === model.id ? 'text-primary' : 'text-foreground'}`}>{model.name}</div>
                                                        <div className="text-[11px] text-muted-foreground font-medium truncate w-32">{model.desc}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Disclaimer */}
            {centered && (
                <p className="text-center mt-3 text-[12px] text-muted-foreground/60">
                    MultiAgent can make mistakes. Verify important info.
                </p>
            )}
        </div>
    );
});

TaskInput.displayName = 'TaskInput';

export default TaskInput;
