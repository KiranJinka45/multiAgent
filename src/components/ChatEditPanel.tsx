"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    Loader2,
    Sparkles,
    X,
    Bot,
    User,
    CheckCircle2,
    FileCode,
    ChevronDown,
    Wand2,
    RotateCcw,
    AlertTriangle,
    ShieldCheck,
    Wrench,
    RefreshCw,
    Info
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────

interface Patch {
    path: string;
    action: string;
    type?: string;
    reason?: string;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    patches?: Patch[];
    buildStatus?: 'success' | 'healed' | 'warning' | 'error';
    buildErrors?: string[];
    healAttempts?: number;
    previewReloaded?: boolean;
    elapsedMs?: number;
    timestamp: Date;
    isLoading?: boolean;
}

interface ChatEditPanelProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onFilesUpdated?: (patches: Patch[]) => void;
    onNavigateToFile?: (filePath: string) => void;
    onPreviewReload?: () => void;
}

// ── Quick suggestion chips ─────────────────────────────────────────

const SUGGESTIONS = [
    { icon: '🌙', label: 'Add dark mode toggle' },
    { icon: '📊', label: 'Add analytics dashboard' },
    { icon: '🔒', label: 'Add user authentication' },
    { icon: '💳', label: 'Add Stripe payments' },
    { icon: '📱', label: 'Make fully responsive' },
    { icon: '🎨', label: 'Improve the visual design' },
    { icon: '🗄️', label: 'Add database schema' },
    { icon: '⚡', label: 'Add loading skeletons' },
];

// ── Build status pill ──────────────────────────────────────────────

const BuildStatusBadge: React.FC<{
    status: string;
    healed: boolean;
    healAttempts: number;
    errors: string[];
    elapsedMs?: number;
}> = ({ status, healed, healAttempts, errors, elapsedMs }) => {
    const [expanded, setExpanded] = useState(false);

    const configs = {
        success: {
            icon: <ShieldCheck size={11} />,
            label: 'Type-checked • Clean',
            cls: 'text-green-400 bg-green-500/8 border-green-500/20',
        },
        healed: {
            icon: <Wrench size={11} />,
            label: `Auto-healed (${healAttempts} fix${healAttempts !== 1 ? 'es' : ''})`,
            cls: 'text-amber-400 bg-amber-500/8 border-amber-500/20',
        },
        warning: {
            icon: <AlertTriangle size={11} />,
            label: 'Applied with warnings',
            cls: 'text-orange-400 bg-orange-500/8 border-orange-500/20',
        },
        error: {
            icon: <AlertTriangle size={11} />,
            label: 'Build errors remain',
            cls: 'text-red-400 bg-red-500/8 border-red-500/20',
        },
    };

    const cfg = configs[status as keyof typeof configs] || configs.success;

    return (
        <div className="mt-1.5">
            <button
                onClick={() => errors.length > 0 && setExpanded(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all ${cfg.cls} ${errors.length > 0 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            >
                {cfg.icon}
                <span>{cfg.label}</span>
                {elapsedMs && <span className="opacity-50 ml-1">{(elapsedMs / 1000).toFixed(1)}s</span>}
                {errors.length > 0 && (
                    <ChevronDown size={9} className={`ml-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                )}
            </button>

            <AnimatePresence>
                {expanded && errors.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-1.5"
                    >
                        <div className="bg-black/40 rounded-xl border border-white/5 p-2.5 font-mono text-[10px] text-red-300/70 space-y-1 max-h-24 overflow-y-auto">
                            {errors.slice(0, 5).map((e, i) => (
                                <div key={i} className="truncate">{e}</div>
                            ))}
                            {errors.length > 5 && (
                                <div className="text-white/30">+ {errors.length - 5} more</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Clickable patch badge ──────────────────────────────────────────

const PatchBadge: React.FC<{
    patch: Patch;
    onClick?: () => void;
}> = ({ patch, onClick }) => {
    const colors = {
        create: 'text-green-400 bg-green-500/8 border-green-500/20 hover:border-green-500/50',
        modify: 'text-blue-400 bg-blue-500/8 border-blue-500/20 hover:border-blue-500/50',
        delete: 'text-red-400 bg-red-500/8 border-red-500/20 hover:border-red-500/50',
    };
    const labels = { create: '+ Created', modify: '~ Modified', delete: '× Deleted' };
    const action = patch.action || patch.type || 'modify';
    const color = colors[action as keyof typeof colors] || colors.modify;
    const label = labels[action as keyof typeof labels] || '~ Changed';

    return (
        <button
            onClick={onClick}
            title={onClick ? `Click to open ${patch.path}` : undefined}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${color} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
        >
            <FileCode size={11} />
            <span className="font-bold">{label}:</span>
            <span className="font-mono truncate max-w-[160px]">
                {patch.path.split('/').pop()}
            </span>
        </button>
    );
};

// ── Message bubble ─────────────────────────────────────────────────

const MessageBubble: React.FC<{
    message: ChatMessage;
    onNavigateToFile?: (path: string) => void;
}> = ({ message, onNavigateToFile }) => {
    const isUser = message.role === 'user';
    const [showExplain, setShowExplain] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isUser
                    ? 'bg-primary/20 border border-primary/30'
                    : 'bg-gradient-to-br from-violet-500 to-blue-600 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                }`}>
                {isUser
                    ? <User size={13} className="text-primary" />
                    : <Bot size={13} className="text-white" />
                }
            </div>

            {/* Content */}
            <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Bubble */}
                <div className={`relative px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${isUser
                        ? 'bg-primary/15 border border-primary/25 text-white rounded-tr-sm'
                        : 'bg-white/[0.04] border border-white/8 text-gray-200 rounded-tl-sm'
                    }`}>
                    {message.isLoading ? (
                        <span className="flex items-center gap-2 text-gray-400">
                            <Loader2 size={13} className="animate-spin" />
                            <span className="animate-pulse">Patching files & verifying…</span>
                        </span>
                    ) : (
                        message.content
                    )}
                </div>

                {/* Preview reload badge */}
                {message.previewReloaded && (
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/70 font-bold">
                        <RefreshCw size={9} className="animate-spin-once" />
                        Preview updated
                    </div>
                )}

                {/* Build status */}
                {message.buildStatus && !message.isLoading && (
                    <BuildStatusBadge
                        status={message.buildStatus}
                        healed={message.healAttempts ? message.healAttempts > 0 : false}
                        healAttempts={message.healAttempts || 0}
                        errors={message.buildErrors || []}
                        elapsedMs={message.elapsedMs}
                    />
                )}

                {/* Patch badges — clickable → navigate to file */}
                {message.patches && message.patches.length > 0 && !message.isLoading && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex flex-col gap-1.5 w-full"
                    >
                        <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                            <CheckCircle2 size={9} className="text-green-500" />
                            {message.patches.length} file{message.patches.length !== 1 ? 's' : ''} changed
                            {onNavigateToFile && <span className="text-white/20">• click to open</span>}
                        </div>
                        {message.patches.map((p, i) => (
                            <PatchBadge
                                key={i}
                                patch={p}
                                onClick={
                                    onNavigateToFile && p.action !== 'delete'
                                        ? () => onNavigateToFile(p.path)
                                        : undefined
                                }
                            />
                        ))}
                    </motion.div>
                )}

                {/* Timestamp */}
                <span className="text-[10px] text-white/20 font-medium px-0.5">
                    {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </motion.div>
    );
};

// ── Main ChatEditPanel ──────────────────────────────────────────────

const ChatEditPanel: React.FC<ChatEditPanelProps> = ({
    projectId,
    isOpen,
    onClose,
    onFilesUpdated,
    onNavigateToFile,
    onPreviewReload
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'welcome',
        role: 'assistant',
        content: "I'm your AI editor. Describe any change — I'll patch only the necessary files, verify the TypeScript, and auto-fix any errors before reloading your preview.",
        timestamp: new Date()
    }]);
    const [inputValue, setInputValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
    useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen]);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
    };

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isSubmitting) return;

        const userId = `user-${Date.now()}`;
        const loadingId = `loading-${Date.now()}`;

        setMessages(prev => [
            ...prev,
            { id: userId, role: 'user', content: trimmed, timestamp: new Date() },
            { id: loadingId, role: 'assistant', content: '', isLoading: true, timestamp: new Date() }
        ]);
        setInputValue('');
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/projects/${projectId}/edit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Trigger callbacks
                if (data.patches?.length) onFilesUpdated?.(data.patches);
                if (data.previewReloaded) onPreviewReload?.();

                const assistantMsg: ChatMessage = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: data.message || data.explanation || 'Changes applied successfully.',
                    patches: data.patches || [],
                    buildStatus: data.buildStatus || 'success',
                    buildErrors: data.buildErrors || [],
                    healAttempts: data.healAttempts || 0,
                    previewReloaded: !!data.previewReloaded,
                    elapsedMs: data.elapsedMs,
                    timestamp: new Date()
                };
                setMessages(prev => prev.filter(m => m.id !== loadingId).concat(assistantMsg));
            } else {
                const errContent = data.error === 'Project has no files yet. Run a build first.'
                    ? "This project hasn't been built yet. Run a build first, then come back to make chat edits."
                    : `Something went wrong: ${data.error || 'Unknown error'}. Try rephrasing your request.`;

                setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
                    id: `err-${Date.now()}`,
                    role: 'assistant',
                    content: errContent,
                    timestamp: new Date()
                }));
            }
        } catch (e: any) {
            setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
                id: `err-${Date.now()}`,
                role: 'assistant',
                content: 'Network error — make sure the app is running and try again.',
                timestamp: new Date()
            }));
        } finally {
            setIsSubmitting(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [projectId, isSubmitting, onFilesUpdated, onPreviewReload]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue); }
    };

    const clearHistory = () => {
        setMessages([{
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            content: 'Chat cleared. What would you like to change next?',
            timestamp: new Date()
        }]);
    };

    const showSuggestions = messages.length <= 1;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="chat-panel"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="flex flex-col h-full w-full bg-[#060608] border-l border-white/[0.06] relative overflow-hidden"
                >
                    {/* Ambient glow */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-violet-500/[0.04] to-transparent" />
                        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/[0.03] to-transparent" />
                    </div>

                    {/* ── Header ── */}
                    <div className="relative z-10 flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] bg-[#080810]/80 backdrop-blur-xl shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.35)]">
                                <Wand2 size={15} className="text-white" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-400 leading-none mb-0.5">AI Editor</div>
                                <div className="text-[13px] font-bold text-white leading-none">Chat & Edit</div>
                            </div>
                            <div className="flex items-center gap-1 ml-1 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
                                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Verified</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={clearHistory} title="Clear history" className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                                <RotateCcw size={13} />
                            </button>
                            <button onClick={onClose} className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* ── Capability bar ── */}
                    <div className="relative z-10 flex items-center gap-3 px-4 py-2 border-b border-white/[0.04] bg-black/20 shrink-0">
                        {[
                            { icon: <ShieldCheck size={9} />, label: 'Type-checked', cls: 'text-green-400/60' },
                            { icon: <Wrench size={9} />, label: 'Auto-healed', cls: 'text-amber-400/60' },
                            { icon: <RefreshCw size={9} />, label: 'Preview synced', cls: 'text-cyan-400/60' },
                        ].map((cap, i) => (
                            <div key={i} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide ${cap.cls}`}>
                                {cap.icon} {cap.label}
                            </div>
                        ))}
                    </div>

                    {/* ── Messages ── */}
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-5 custom-scrollbar"
                    >
                        {messages.map(msg => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                onNavigateToFile={onNavigateToFile}
                            />
                        ))}

                        {/* Suggestion chips */}
                        {showSuggestions && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="flex flex-wrap gap-2 pt-1"
                            >
                                {SUGGESTIONS.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(s.label)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-primary/30 rounded-xl text-[12px] font-medium text-white/50 hover:text-white/80 transition-all"
                                    >
                                        <span>{s.icon}</span>
                                        <span>{s.label}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Scroll to bottom */}
                    <AnimatePresence>
                        {showScrollBtn && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={scrollToBottom}
                                className="absolute bottom-28 right-4 z-20 p-2 bg-[#0d0d0d] border border-white/10 rounded-full shadow-xl text-white/50 hover:text-white hover:border-primary/30 transition-all"
                            >
                                <ChevronDown size={14} />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* ── Input ── */}
                    <div className="relative z-10 px-4 pb-4 pt-3 border-t border-white/[0.05] bg-[#080810]/60 backdrop-blur-xl shrink-0">
                        <div className={`flex gap-2.5 p-3 bg-white/[0.04] rounded-2xl border transition-all ${isSubmitting
                                ? 'border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.08)]'
                                : 'border-white/[0.07] hover:border-white/[0.12] focus-within:border-primary/40 focus-within:shadow-[0_0_25px_rgba(59,130,246,0.06)]'
                            }`}>
                            <Sparkles
                                size={15}
                                className={`mt-2.5 shrink-0 transition-colors ${isSubmitting ? 'text-violet-400 animate-pulse' : 'text-white/20'}`}
                            />
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe your change… (Enter to send)"
                                disabled={isSubmitting}
                                rows={1}
                                onInput={e => {
                                    const t = e.target as HTMLTextAreaElement;
                                    t.style.height = 'auto';
                                    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                                }}
                                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/20 outline-none resize-none font-medium leading-relaxed py-1.5 min-h-[36px]"
                            />
                            <button
                                onClick={() => sendMessage(inputValue)}
                                disabled={isSubmitting || !inputValue.trim()}
                                className={`self-end p-2 rounded-xl transition-all ${inputValue.trim() && !isSubmitting
                                        ? 'bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:brightness-110'
                                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                                    }`}
                            >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            </button>
                        </div>
                        <p className="text-[10px] text-white/15 text-center mt-2 font-medium">
                            Patches are type-checked & auto-healed before applying
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ChatEditPanel;
