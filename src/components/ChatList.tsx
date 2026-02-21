'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
    Sparkles, User, Copy, ThumbsUp, ThumbsDown, RefreshCw, PenSquare,
    Check, MoreHorizontal, MessageSquarePlus, Volume2, GitFork,
    Upload, RotateCw, Brain, ChevronDown, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { Message } from '@/types/chat';
import CodeBlock from './CodeBlock';
import { chatService } from '@/lib/chat-service';
import { projectService } from '@/lib/project-service';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import ShareDialog from './ShareDialog';

type ChatListProps = {
    messages: Message[];
    onEdit?: (message: Message) => void;
    onRegenerate?: (messageId: string) => void;
};

// Memoized Message Item for performance
const MessageItem = memo(({
    msg,
    onEdit,
    onRegenerate,
    copyToClipboard,
    handleFeedback,
    handleReadAloud,
    handleOpenShare,
    handleBranch,
    readingMessageId,
    activeMenu,
    setActiveMenu,
    feedback
}: {
    msg: Message,
    onEdit?: (m: Message) => void,
    onRegenerate?: (id: string) => void,
    copyToClipboard: (t: string) => void,
    handleFeedback: (id: string, t: 'up' | 'down') => void,
    handleReadAloud: (id: string, t: string) => void,
    handleOpenShare: (m: Message) => void,
    handleBranch: (id: string) => void,
    readingMessageId: string | null,
    activeMenu: string | null,
    setActiveMenu: (id: string | null) => void,
    feedback: Record<string, 'up' | 'down' | null>
}) => {
    const router = useRouter();
    const isUser = msg.role === 'user';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={`flex w-full group ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`flex max-w-[85%] md:max-w-[80%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-1 transition-transform group-hover:scale-110 shadow-lg ${isUser
                    ? 'bg-neutral-800 border border-white/5 text-white'
                    : 'bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-white'
                    }`}>
                    {isUser ? <User size={18} /> : <Sparkles size={18} className="animate-pulse" />}
                </div>

                {/* Content Container */}
                <div className={`flex flex-col gap-2 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`relative transition-all duration-300 ${isUser
                        ? 'px-5 py-3.5 glass-card rounded-2xl rounded-tr-sm text-foreground hover:shadow-primary/5'
                        : 'px-0 py-3 text-foreground w-full'
                        }`}>
                        {isUser ? (
                            <div className="relative group/user-msg">
                                <div className="text-base font-medium leading-relaxed">{msg.content}</div>
                                <div className="absolute top-0 -left-12 opacity-0 group-hover/user-msg:opacity-100 transition-opacity flex flex-col gap-2">
                                    <button
                                        onClick={() => onEdit?.(msg)}
                                        className="p-2 text-muted-foreground hover:text-foreground glass rounded-lg transition-all active:scale-90"
                                    >
                                        <PenSquare size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0 max-w-none">
                                {/* Thinking Mode UI */}
                                {msg.content.includes('Thinking...') && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mb-6 overflow-hidden"
                                    >
                                        <div className="glass-card rounded-2xl border-l-4 border-primary p-4 bg-primary/5">
                                            <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase tracking-widest">
                                                <Brain size={14} className="animate-pulse" />
                                                <span>Deep Reasoning</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground italic leading-relaxed">
                                                {msg.content.split('\n\n')[0].replace('Thinking...', '').trim() || 'Analyzing complexity and architecting solution...'}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                <ReactMarkdown
                                    components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline && match ? (
                                                <CodeBlock
                                                    language={match[1]}
                                                    value={String(children).replace(/\n$/, '')}
                                                    {...props}
                                                />
                                            ) : (
                                                <code className={`${className} glass px-1.5 py-0.5 rounded text-sm font-mono text-primary`} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                        img({ node, ...props }: any) {
                                            return (
                                                <div className="my-6 overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 shadow-2xl group/img">
                                                    <img
                                                        {...props}
                                                        className="w-full h-auto object-cover max-h-[700px] transition-transform duration-700 group-hover/img:scale-[1.03] cursor-zoom-in"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            );
                                        },
                                        p({ children }) {
                                            return <p className="text-[17px] leading-[1.7] text-foreground/90 font-medium mb-4">{children}</p>;
                                        }
                                    }}
                                >
                                    {msg.content
                                        .replace('[SITE_BUILD_REQUEST]', '')
                                        .replace(/Thinking\.\.\.[\s\S]*?\n\n/, '')}
                                </ReactMarkdown>

                                {/* Build Request Optimization */}
                                {msg.content.includes('[SITE_BUILD_REQUEST]') && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        className="mt-8 p-8 glass-card rounded-[2.5rem] border-primary/20 bg-gradient-to-br from-primary/10 via-background/40 to-transparent relative group overflow-hidden"
                                    >
                                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-700" />

                                        <div className="relative flex flex-col items-center text-center gap-6">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/40 relative">
                                                <RefreshCw size={32} className="animate-spin-slow stroke-[2.5]" />
                                                <div className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                                                    <Zap size={12} className="text-primary fill-primary" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-black tracking-tight">MultiAgent Engine Ready</h3>
                                                <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed font-medium">
                                                    Full project architecture validated. specialized build environment is prepared for high-fidelity implementation.
                                                </p>
                                            </div>

                                            <button
                                                onClick={async () => {
                                                    const toastId = toast.loading("Launching High-Fidelity Builder...");
                                                    try {
                                                        const userPrompt = "Custom Project";
                                                        const { data: project } = await projectService.createProject(
                                                            userPrompt,
                                                            "AI generated project base",
                                                            'application'
                                                        );
                                                        if (project) {
                                                            toast.success("Build environment ready", { id: toastId });
                                                            router.push(`/projects/${project.id}`);
                                                        }
                                                    } catch (e) {
                                                        toast.error("Build engine failure", { id: toastId });
                                                    }
                                                }}
                                                className="px-8 py-3.5 bg-primary text-primary-foreground text-sm font-black rounded-full shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest"
                                            >
                                                <Zap size={18} className="fill-current" />
                                                Initialize Construction
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Assistant Actions Bar */}
                    {!isUser && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ml-1">
                            {[
                                { icon: Copy, title: "Copy", onClick: () => copyToClipboard(msg.content) },
                                { icon: ThumbsUp, title: "Good", onClick: () => handleFeedback(msg.id, 'up'), active: feedback[msg.id] === 'up', activeColor: 'text-green-400 bg-green-400/10 border-green-400/20' },
                                { icon: ThumbsDown, title: "Bad", onClick: () => handleFeedback(msg.id, 'down'), active: feedback[msg.id] === 'down', activeColor: 'text-red-400 bg-red-400/10 border-red-400/20' },
                                { icon: Upload, title: "Share", onClick: () => handleOpenShare(msg) },
                                { icon: RotateCw, title: "Regenerate", onClick: () => onRegenerate?.(msg.id) },
                            ].map((btn, i) => (
                                <button
                                    key={i}
                                    onClick={btn.onClick}
                                    title={btn.title}
                                    className={`p-2 rounded-xl transition-all active:scale-90 border border-transparent ${btn.active ? btn.activeColor : 'text-muted-foreground hover:text-foreground hover:glass hover:border-white/10'
                                        }`}
                                >
                                    <btn.icon size={15} />
                                </button>
                            ))}

                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenu(activeMenu === msg.id ? null : msg.id);
                                    }}
                                    className={`p-2 rounded-xl transition-all border border-transparent ${activeMenu === msg.id ? 'glass text-foreground border-white/10' : 'text-muted-foreground hover:text-foreground hover:glass'
                                        }`}
                                >
                                    <MoreHorizontal size={15} />
                                </button>

                                <AnimatePresence>
                                    {activeMenu === msg.id && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            className="absolute left-0 bottom-full mb-3 w-56 glass-card rounded-2xl shadow-2xl p-1.5 z-50 overflow-hidden"
                                        >
                                            <div className="px-3 py-2 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 border-b border-white/5 mb-1">
                                                {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                                            </div>
                                            <div className="space-y-0.5">
                                                <button
                                                    onClick={() => handleBranch(msg.id)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-xs font-bold text-foreground transition-all group/opt"
                                                >
                                                    <GitFork size={14} className="text-muted-foreground group-hover/opt:text-primary transition-colors" />
                                                    Branch from here
                                                </button>
                                                <button
                                                    onClick={() => handleReadAloud(msg.id, msg.content)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-xs font-bold transition-all group/opt ${readingMessageId === msg.id ? 'text-red-400' : 'text-foreground'}`}
                                                >
                                                    <Volume2 size={14} className={readingMessageId === msg.id ? 'text-red-400 animate-pulse' : 'text-muted-foreground group-hover/opt:text-primary transition-colors'} />
                                                    {readingMessageId === msg.id ? 'Stop Narration' : 'Read Aloud'}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

MessageItem.displayName = 'MessageItem';

export default function ChatList({ messages, onEdit, onRegenerate }: ChatListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<Record<string, 'up' | 'down' | null>>({});
    const [readingMessageId, setReadingMessageId] = useState<string | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareData, setShareData] = useState({ title: '', summary: '' });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
        setActiveMenu(null);
    };

    const handleFeedback = (messageId: string, type: 'up' | 'down') => {
        setFeedback(prev => ({
            ...prev,
            [messageId]: prev[messageId] === type ? null : type
        }));
        toast.success(type === 'up' ? "Insightful feedback!" : "Noted. Enhancing models...");
    };

    const handleReadAloud = (messageId: string, text: string) => {
        if ('speechSynthesis' in window) {
            if (readingMessageId === messageId) {
                window.speechSynthesis.cancel();
                setReadingMessageId(null);
            } else {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onend = () => setReadingMessageId(null);
                utterance.onerror = () => setReadingMessageId(null);

                const voices = window.speechSynthesis.getVoices();
                const v = voices.find(v => v.name.includes('Google') || v.name.includes('Premium')) || voices[0];
                if (v) utterance.voice = v;

                window.speechSynthesis.speak(utterance);
                setReadingMessageId(messageId);
                toast.success("Narration started");
            }
        } else {
            toast.error("TTS unavailable");
        }
        setActiveMenu(null);
    };

    const handleOpenShare = (message: Message) => {
        setShareData({
            title: "MultiAgent Intelligence Log",
            summary: message.content.substring(0, 150) + "..."
        });
        setShareModalOpen(true);
    };

    const handleBranch = async (messageId: string) => {
        toast.info("Branching mission...");
        setActiveMenu(null);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 md:px-0 space-y-12 pb-24 pt-8">
            <ShareDialog
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                title={shareData.title}
                summary={shareData.summary}
            />

            <AnimatePresence initial={false} mode='popLayout'>
                {messages.map((msg) => (
                    <MessageItem
                        key={msg.id}
                        msg={msg}
                        onEdit={onEdit}
                        onRegenerate={onRegenerate}
                        copyToClipboard={copyToClipboard}
                        handleFeedback={handleFeedback}
                        handleReadAloud={handleReadAloud}
                        handleOpenShare={handleOpenShare}
                        handleBranch={handleBranch}
                        readingMessageId={readingMessageId}
                        activeMenu={activeMenu}
                        setActiveMenu={setActiveMenu}
                        feedback={feedback}
                    />
                ))}
            </AnimatePresence>

            <div ref={messagesEndRef} className="h-4" />
        </div>
    );
}
