'use client';

import { Plus, Sparkles, Mic, Send, ChevronDown, Image, FileText, HardDrive, Notebook, Palette, Layout, BookOpen, Search } from 'lucide-react';
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Add type support for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

type TaskInputProps = {
    onAddTask: (title: string, model: ModelType, tool?: string) => void;
    centered?: boolean;
};

type ModelType = 'Fast' | 'Thinking' | 'Pro';

export interface TaskInputHandle {
    setInput: (value: string) => void;
    focus: () => void;
}

const TaskInput = forwardRef<TaskInputHandle, TaskInputProps>(({ onAddTask, centered = false }, ref) => {
    const [title, setTitle] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Menus state
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showToolsMenu, setShowToolsMenu] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ModelType>('Fast');
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        setInput: (value: string) => setTitle(value),
        focus: () => inputRef.current?.focus()
    }));

    useEffect(() => {
        if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0].transcript)
                    .join('');
                setTitle(transcript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsRecording(false);
                toast.error("Microphone error");
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }
    }, []);

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            toast.error("Speech recognition not supported in this browser");
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current.start();
            setIsRecording(true);
            toast.info("Listening...");
        }
    };

    const handleFeatureClick = (feature: string) => {
        if (feature === 'Create images') {
            setTitle('Generate an image: ');
            setTimeout(() => inputRef.current?.focus(), 50);
        } else if (feature === 'Deep Research') {
            setTitle('Research topic: ');
            setTimeout(() => inputRef.current?.focus(), 50);
        } else if (feature === 'Guided Learning') {
            setTitle('Teach me about: ');
            setTimeout(() => inputRef.current?.focus(), 50);
        } else if (feature === 'Upload files') {
            fileInputRef.current?.click();
        } else {
            toast.info(`Selected: ${feature}`, {
                description: "This feature is currently a UI mock."
            });
        }
        setShowPlusMenu(false);
        setShowToolsMenu(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
            toast.success(`${e.target.files.length} file(s) attached`);
        }
    };

    const removeFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim() || attachedFiles.length > 0) {
            let tool = undefined;
            let prompt = title;

            if (title.startsWith('Generate an image: ')) {
                tool = 'image';
                prompt = title.replace('Generate an image: ', '');
            } else if (title.startsWith('Research topic: ')) {
                tool = 'research';
                prompt = title.replace('Research topic: ', '');
            } else if (title.startsWith('Teach me about: ')) {
                tool = 'learning';
                prompt = title.replace('Teach me about: ', '');
            }

            onAddTask(prompt, selectedModel, tool);
            setTitle('');
            setAttachedFiles([]);
            setShowPlusMenu(false);
            setShowToolsMenu(false);
            setShowModelMenu(false);
        }
    };

    // Conditional classes based on 'centered' prop
    const containerClasses = centered
        ? "w-full max-w-3xl mx-auto relative z-40"
        : "fixed bottom-0 left-0 md:left-64 right-0 p-6 pb-8 bg-gradient-to-t from-background via-background to-transparent z-40";

    const inputWrapperClasses = centered
        ? "relative flex items-center bg-card border border-input rounded-[2rem] p-3 pr-4 shadow-2xl transition-all duration-300 focus-within:bg-accent/50 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring w-full"
        : "relative flex items-center bg-card border border-input rounded-[2rem] p-2 pr-4 shadow-2xl transition-all duration-300 focus-within:bg-accent/50 focus-within:border-ring w-full max-w-4xl mx-auto";

    return (
        <div className={containerClasses}>
            {/* Menus Layer */}
            <AnimatePresence>
                {/* Plus Menu */}
                {showPlusMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute bg-popover border border-border rounded-2xl shadow-2xl p-2 min-w-[200px] z-50 flex flex-col gap-1 ${centered ? 'bottom-full mb-4 left-0' : 'bottom-24 left-8'}`}
                    >
                        <button onClick={() => handleFeatureClick('Upload files')} className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-colors text-sm font-medium text-left">
                            <FileText size={18} className="text-red-400" />
                            Upload files
                        </button>
                        <button onClick={() => handleFeatureClick('Add from Drive')} className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-colors text-sm font-medium text-left">
                            <HardDrive size={18} className="text-blue-400" />
                            Add from Drive
                        </button>
                        <button onClick={() => handleFeatureClick('Photos')} className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-colors text-sm font-medium text-left">
                            <Image size={18} className="text-yellow-400" />
                            Photos
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button onClick={() => handleFeatureClick('NotebookLM')} className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-colors text-sm font-medium text-left">
                            <Notebook size={18} className="text-purple-400" />
                            NotebookLM
                        </button>
                    </motion.div>
                )}

                {/* Tools Menu */}
                {showToolsMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute bg-popover border border-border rounded-2xl shadow-2xl p-2 min-w-[220px] z-50 flex flex-col gap-1 ${centered ? 'bottom-full mb-4 right-0' : 'bottom-24 right-8'}`}
                    >
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tools</div>
                        <button onClick={() => handleFeatureClick('Deep Research')} className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-colors text-sm font-medium text-left">
                            <Search size={18} className="text-blue-400" />
                            Deep Research
                        </button>
                        <button onClick={() => handleFeatureClick('Create images')} className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-colors text-sm font-medium text-left">
                            <Palette size={18} className="text-orange-400" />
                            Create images
                        </button>
                        <button onClick={() => handleFeatureClick('Canvas')} className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-colors text-sm font-medium text-left">
                            <Layout size={18} className="text-green-400" />
                            Canvas
                        </button>
                        <button onClick={() => handleFeatureClick('Guided Learning')} className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-colors text-sm font-medium text-left">
                            <BookOpen size={18} className="text-indigo-400" />
                            Guided Learning
                        </button>
                    </motion.div>
                )}

                {/* Model Menu */}
                {showModelMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute bg-popover border border-border rounded-2xl shadow-2xl p-2 min-w-[180px] z-50 flex flex-col gap-1 ${centered ? 'bottom-full mb-4 right-16' : 'bottom-24 right-32'}`}
                    >
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gemini 3</div>
                        <button onClick={() => { setSelectedModel('Fast'); setShowModelMenu(false); }} className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors text-sm font-medium text-left ${selectedModel === 'Fast' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                            <div>
                                <div className="font-semibold">Fast</div>
                                <div className="text-xs text-muted-foreground font-normal">Answers quickly</div>
                            </div>
                            {selectedModel === 'Fast' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </button>
                        <button onClick={() => { setSelectedModel('Thinking'); setShowModelMenu(false); }} className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors text-sm font-medium text-left ${selectedModel === 'Thinking' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                            <div>
                                <div className="font-semibold">Thinking</div>
                                <div className="text-xs text-muted-foreground font-normal">Solves complex problems</div>
                            </div>
                            {selectedModel === 'Thinking' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </button>
                        <button onClick={() => { setSelectedModel('Pro'); setShowModelMenu(false); }} className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors text-sm font-medium text-left ${selectedModel === 'Pro' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                            <div>
                                <div className="font-semibold">Pro</div>
                                <div className="text-xs text-muted-foreground font-normal">Advanced reasoning</div>
                            </div>
                            {selectedModel === 'Pro' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className={`w-full relative ${centered ? '' : 'max-w-4xl mx-auto'}`}>
                {/* Attached Files UI */}
                <AnimatePresence>
                    {attachedFiles.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="flex flex-wrap gap-2 mb-3 px-2"
                        >
                            {attachedFiles.map((file, idx) => (
                                <div key={`${file.name}-${idx}`} className="flex items-center gap-2 px-3 py-1.5 bg-accent/50 border border-border rounded-xl text-xs font-medium text-foreground">
                                    <FileText size={14} className="text-blue-400" />
                                    <span className="max-w-[120px] truncate">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
                                        className="ml-1 p-0.5 hover:bg-background rounded-full transition-colors"
                                    >
                                        <Plus size={14} className="rotate-45" />
                                    </button>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className={inputWrapperClasses}>
                    {/* Left Actions */}
                    <button
                        type="button"
                        onClick={() => setShowPlusMenu(!showPlusMenu)}
                        className={`p-3 rounded-full transition-colors ${showPlusMenu ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                    >
                        <Plus size={20} className={`transition-transform duration-300 ${showPlusMenu ? 'rotate-45' : ''}`} />
                    </button>

                    {/* Input Field */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={isRecording ? "Listening..." : "Ask MultiAgent"}
                        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground text-lg px-2 min-w-0"
                        autoFocus={centered}
                    />

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Tools / Features */}
                        {!title && (
                            <button
                                type="button"
                                onClick={() => setShowToolsMenu(!showToolsMenu)}
                                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-medium ${showToolsMenu ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                            >
                                <Sparkles size={16} />
                                <span>Tools</span>
                            </button>
                        )}

                        {/* Pro Selector (Visual only) */}
                        <button
                            type="button"
                            onClick={() => setShowModelMenu(!showModelMenu)}
                            className="hidden sm:flex items-center gap-1 pl-3 pr-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors text-sm font-medium"
                        >
                            <span>{selectedModel}</span>
                            <ChevronDown size={14} />
                        </button>

                        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

                        {/* Submit / Mic */}
                        {title.trim() ? (
                            <button
                                type="submit"
                                className="p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors active:scale-95"
                            >
                                <Send size={20} className="ml-0.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={toggleRecording}
                                className={`p-3 rounded-full transition-all duration-300 ${isRecording ? 'bg-destructive text-destructive-foreground scale-110 animate-pulse' : 'text-foreground bg-accent hover:bg-accent/80'}`}
                            >
                                <Mic size={20} />
                            </button>
                        )}
                    </div>
                </div>
                {!centered && (
                    <p className="text-center text-xs text-muted-foreground mt-3 font-medium">
                        MultiAgent can make mistakes. Check important info.
                    </p>
                )}
            </form>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
});

TaskInput.displayName = 'TaskInput';

export default TaskInput;
