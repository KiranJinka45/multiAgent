'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
    Send, Mic, MicOff, Paperclip, Globe, Image as ImageIcon, Sparkles,
    ChevronDown, Plus, Cpu, Zap, Brain, Wand2, FileText, Github,
    MoreHorizontal, X, Music, Video, Code, Table, ArrowUp
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
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

const TaskInput = forwardRef<TaskInputHandle, TaskInputProps>(({ onAddTask, placeholder = "How can MultiAgent help you today?", centered = false }, ref) => {
    const { setIsGithubModalOpen } = useSidebar();
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
        <div className={`w-full transition-all duration-500 ${centered ? 'max-w-3xl mx-auto' : 'max-w-4xl mx-auto px-4 md:px-6'}`}>
            <div
                className={`relative transition-all duration-500 rounded-[2rem] border overflow-hidden ${isFocused
                    ? 'glass-card ring-2 ring-primary/20 border-primary/30 shadow-[0_0_50px_-12px_rgba(var(--primary),0.2)]'
                    : 'glass border-white/5 shadow-xl'
                    }`}
            >
                {/* Input Area */}
                <div className="flex flex-col p-2 pt-3">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={title}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        className="w-full px-4 py-2 bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/50 resize-none min-h-[44px] max-h-[200px] text-lg font-medium tracking-tight leading-relaxed custom-scrollbar scroll-smooth"
                    />

                    {/* Bottom Toolbar */}
                    <div className="flex items-center justify-between gap-2 px-2 pb-2 mt-2">
                        <div className="flex items-center gap-1.5" ref={menuRef}>
                            {/* Action Menu Toggle */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="p-2.5 rounded-full hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all active:scale-90 bg-foreground/5"
                                >
                                    <Plus size={20} className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full left-0 mb-4 w-72 glass-card rounded-[1.5rem] shadow-2xl p-2 z-[60]"
                                        >
                                            <div className="grid grid-cols-2 gap-1.5 font-bold">
                                                {[
                                                    { icon: FileText, label: 'Docs', desc: 'PDF, Word, TXT', color: 'text-blue-400' },
                                                    { icon: ImageIcon, label: 'Images', desc: 'PNG, JPG, WebP', color: 'text-purple-400' },
                                                    { icon: Github, label: 'GitHub', desc: 'Integrate repos', color: 'text-green-400' },
                                                    { icon: Code, label: 'Code', desc: 'JS, PY, TS, C++', color: 'text-orange-400' },
                                                ].map((item, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => item.label === 'GitHub' ? setIsGithubModalOpen(true) : null}
                                                        className="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-foreground/5 transition-all text-sm group"
                                                    >
                                                        <item.icon size={22} className={`${item.color} group-hover:scale-110 transition-transform`} />
                                                        <span className="text-foreground">{item.label}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium opacity-60 tracking-tight">{item.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="h-px bg-white/5 my-2 mx-2" />
                                            <div className="px-2 pb-1">
                                                <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-foreground/5 text-sm font-semibold transition-all">
                                                    <Brain size={18} className="text-primary" /> Create Custom Tool
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Model Selector Trigger */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-full hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all active:scale-95 text-xs font-black tracking-widest uppercase border border-white/5"
                                >
                                    <currentModelData.icon size={14} className={currentModelData.color} />
                                    <span>{currentModelData.name}</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isModelMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full left-0 mb-4 w-64 glass-card rounded-[1.5rem] shadow-2xl p-2 z-[60]"
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
                                                            <div className={`text-sm font-bold ${selectedModel === model.id ? 'text-primary' : 'text-foreground'}`}>{model.name}</div>
                                                            <div className="text-[10px] text-muted-foreground font-medium truncate w-32">{model.desc}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsGithubModalOpen(true)}
                                className="p-2.5 rounded-full hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all active:scale-90"
                            >
                                <Github size={18} />
                            </button>
                            <button type="button" className="p-2.5 rounded-full hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all active:scale-90">
                                <Globe size={18} />
                            </button>
                        </div>

                        {/* Submit Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsRecording(!isRecording)}
                                className={`p-2.5 rounded-full transition-all active:scale-90 ${isRecording ? 'bg-red-500/10 text-red-500' : 'hover:bg-foreground/5 text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSubmit()}
                                disabled={!title.trim()}
                                className={`p-3 rounded-full transition-all flex items-center justify-center ${title.trim()
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                                    }`}
                            >
                                <ArrowUp size={22} className="stroke-[3]" />
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Focus indicator animation */}
                <AnimatePresence>
                    {isFocused && (
                        <motion.div
                            layoutId="glow"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 pointer-events-none rounded-[2rem] border border-primary/50"
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Disclaimer */}
            {centered && (
                <p className="text-center mt-6 text-[11px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                    MultiAgent can make mistakes. Verify important info.
                </p>
            )}
        </div>
    );
});

TaskInput.displayName = 'TaskInput';

export default TaskInput;
