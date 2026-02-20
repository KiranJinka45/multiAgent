import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Sparkles, User, Copy, ThumbsUp, ThumbsDown, RefreshCw, PenSquare, Check, MoreHorizontal, MessageSquarePlus, Volume2, GitFork, Upload, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { Message } from '@/types/chat';
import CodeBlock from './CodeBlock';
import { chatService } from '@/lib/chat-service';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import ShareDialog from './ShareDialog';

type ChatListProps = {
    messages: Message[];
    onEdit?: (message: Message) => void;
    onRegenerate?: (messageId: string) => void;
};

export default function ChatList({ messages, onEdit, onRegenerate }: ChatListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Feedback State
    const [feedback, setFeedback] = useState<Record<string, 'up' | 'down' | null>>({});

    // Read Aloud State
    const [readingMessageId, setReadingMessageId] = useState<string | null>(null);

    // Share State
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareData, setShareData] = useState({ title: '', summary: '' });

    const router = useRouter();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Close menu on click outside
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

        // In a real app, you would send this to the backend here
        toast.success(type === 'up' ? "Thanks for the positive feedback!" : "Thanks for the feedback. We'll improve.");
    };

    const handleReadAloud = (messageId: string, text: string) => {
        if ('speechSynthesis' in window) {
            if (readingMessageId === messageId) {
                // Stop reading
                window.speechSynthesis.cancel();
                setReadingMessageId(null);
                toast.info("Stopped reading.");
            } else {
                // Start reading
                window.speechSynthesis.cancel(); // Stop any previous
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onend = () => setReadingMessageId(null);
                utterance.onerror = () => setReadingMessageId(null);

                // Use a default voice if available
                const voices = window.speechSynthesis.getVoices();
                const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
                if (preferredVoice) utterance.voice = preferredVoice;

                window.speechSynthesis.speak(utterance);
                setReadingMessageId(messageId);
                toast.success("Reading aloud...");
            }
        } else {
            toast.error("Text-to-speech not supported in this browser");
        }
        setActiveMenu(null);
    };

    const handleOpenShare = (message: Message) => {
        const summary = message.content.substring(0, 150) + (message.content.length > 150 ? '...' : '');
        setShareData({
            title: "Shared Chat Conversation", // Could be dynamic based on chat title if available
            summary
        });
        setShareModalOpen(true);
    };

    const handleBranch = async (messageId: string) => {
        const index = messages.findIndex(m => m.id === messageId);
        if (index === -1) return;

        const history = messages.slice(0, index + 1);
        const title = `Branched: ${history.find(m => m.role === 'user')?.content.substring(0, 20) || 'Chat'}`;

        const { chat } = await chatService.createChat(title);
        if (chat) {
            // Add messages sequentially to preserve order
            for (const msg of history) {
                await chatService.addMessage(chat.id, msg.content, msg.role);
            }
            router.push(`/c/${chat.id}`);
            toast.success("Created new branched chat");
        }
        setActiveMenu(null);
    };

    return (
        <div className="space-y-6 pb-4">
            <ShareDialog
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                title={shareData.title}
                summary={shareData.summary}
            />
            <AnimatePresence initial={false} mode='popLayout'>
                {messages.map((msg) => (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        key={msg.id}
                        className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user'
                                ? 'bg-neutral-700 text-white'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                                }`}>
                                {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                            </div>

                            {/* Content */}
                            <div className={`flex flex-col gap-2 min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`relative px-5 py-3.5 rounded-2xl text-base leading-relaxed group/message ${msg.role === 'user'
                                    ? 'bg-muted text-foreground rounded-tr-sm'
                                    : 'bg-transparent text-foreground pl-0'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        <div className="relative">
                                            {msg.content}
                                            <div className="absolute -bottom-1 -left-2 transform translate-y-full opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-2 pt-2">
                                                <button
                                                    onClick={() => onEdit?.(msg)}
                                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                                    title="Edit question"
                                                >
                                                    <PenSquare size={14} />
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(msg.content)}
                                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                                    title="Copy text"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0 max-w-none">
                                            {/* Thinking Mode UI Concept */}
                                            {msg.content.includes('Thinking...') && (
                                                <div className="mb-4 p-3 bg-accent/30 border-l-2 border-primary rounded-r-lg text-sm text-muted-foreground italic flex items-start gap-2 animate-in fade-in duration-700">
                                                    <Sparkles size={14} className="mt-1 shrink-0 text-primary" />
                                                    <div>
                                                        <span className="font-semibold block mb-1 not-italic">Thought Process</span>
                                                        {msg.content.split('\n\n')[0]}
                                                    </div>
                                                </div>
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
                                                            <code className={`${className} bg-muted rounded px-1.5 py-0.5 text-sm font-mono`} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    },
                                                    img({ node, ...props }: any) {
                                                        return (
                                                            <div className="my-4 overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-2xl animate-in zoom-in-95 duration-500">
                                                                <img
                                                                    {...props}
                                                                    className="w-full h-auto object-cover max-h-[600px] hover:scale-[1.02] transition-transform duration-500 cursor-zoom-in"
                                                                    loading="lazy"
                                                                />
                                                            </div>
                                                        );
                                                    }
                                                }}
                                            >
                                                {msg.content.includes('Thinking...') ? msg.content.substring(msg.content.indexOf('\n\n') + 2) : msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>

                                {/* Assistant Actions */}
                                {msg.role === 'assistant' && (
                                    <div className="flex items-center gap-1 pl-0 mt-2">
                                        <button
                                            onClick={() => copyToClipboard(msg.content)}
                                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                            title="Copy"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleFeedback(msg.id, 'up')}
                                            className={`p-1.5 hover:bg-accent rounded-lg transition-colors ${feedback[msg.id] === 'up' ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground hover:text-foreground'}`}
                                            title="Good response"
                                        >
                                            <ThumbsUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleFeedback(msg.id, 'down')}
                                            className={`p-1.5 hover:bg-accent rounded-lg transition-colors ${feedback[msg.id] === 'down' ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-foreground'}`}
                                            title="Bad response"
                                        >
                                            <ThumbsDown size={16} />
                                        </button>
                                        <button
                                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                            title="Share"
                                            onClick={() => handleOpenShare(msg)}
                                        >
                                            <Upload size={16} />
                                        </button>
                                        <button
                                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                            title="Regenerate response"
                                            onClick={() => onRegenerate?.(msg.id)}
                                        >
                                            <RotateCw size={16} />
                                        </button>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenu(activeMenu === msg.id ? null : msg.id);
                                                }}
                                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                                title="More actions"
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>

                                            {/* Assistant Message Menu */}
                                            <AnimatePresence>
                                                {activeMenu === msg.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="absolute left-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 p-1 overflow-hidden"
                                                    >
                                                        <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 border-b border-border">
                                                            {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                                                        </div>
                                                        <div className="p-1 space-y-0.5">
                                                            <button
                                                                onClick={() => handleBranch(msg.id)}
                                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent text-xs font-medium text-foreground transition-colors group/btn"
                                                            >
                                                                <GitFork size={14} className="text-muted-foreground group-hover/btn:text-foreground" />
                                                                Branch in new chat
                                                            </button>
                                                            <button
                                                                onClick={() => handleReadAloud(msg.id, msg.content)}
                                                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent text-xs font-medium transition-colors group/btn ${readingMessageId === msg.id ? 'text-red-500 hover:text-red-600' : 'text-foreground'}`}
                                                            >
                                                                <Volume2 size={14} className={readingMessageId === msg.id ? 'text-red-500 animate-pulse' : 'text-muted-foreground group-hover/btn:text-foreground'} />
                                                                {readingMessageId === msg.id ? 'Stop reading' : 'Read'}
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
                ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />

            <ShareDialog
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                title={shareData.title}
                summary={shareData.summary}
            />
        </div>
    );
}
