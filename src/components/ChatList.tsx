import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Sparkles, User, Copy, ThumbsUp, ThumbsDown, RefreshCw, PenSquare, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Message } from '@/types/chat';
import CodeBlock from './CodeBlock';

type ChatListProps = {
    messages: Message[];
    onEdit?: (message: Message) => void;
};

export default function ChatList({ messages, onEdit }: ChatListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="space-y-6 pb-4">
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
                                                    className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all shadow-sm"
                                                    title="Edit question"
                                                >
                                                    <PenSquare size={12} />
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(msg.content)}
                                                    className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all shadow-sm"
                                                    title="Copy text"
                                                >
                                                    <Copy size={12} />
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
                                    <div className="flex items-center gap-2 pl-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <button
                                            onClick={() => copyToClipboard(msg.content)}
                                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                                            title="Copy"
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors">
                                            <RefreshCw size={14} />
                                        </button>
                                        <div className="w-px h-3 bg-border mx-1" />
                                        <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors">
                                            <ThumbsUp size={14} />
                                        </button>
                                        <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors">
                                            <ThumbsDown size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
        </div>
    );
}
