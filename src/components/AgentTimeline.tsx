"use client";

/**
 * AgentTimeline — Real-time build activity feed.
 *
 * Subscribes to /api/build/events (Redis Streams SSE) and renders only
 * type="agent" events in a chronological list with:
 *  - Color-coded agent badges
 *  - Animated entry (slide-in from left)
 *  - Duration tracking (start → finish pairs)
 *  - Auto-scroll to latest event
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader, Zap, Clock } from 'lucide-react';

// ── Agent Colors ──────────────────────────────────────────────────────────────
const AGENT_PALETTE: Record<string, { bg: string; text: string; dot: string; icon: string }> = {
    PlannerAgent: { bg: 'bg-purple-500/10', text: 'text-purple-300', dot: 'bg-purple-500', icon: '🧠' },
    DatabaseAgent: { bg: 'bg-blue-500/10', text: 'text-blue-300', dot: 'bg-blue-500', icon: '🗄️' },
    BackendAgent: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', dot: 'bg-emerald-500', icon: '⚙️' },
    FrontendAgent: { bg: 'bg-cyan-500/10', text: 'text-cyan-300', dot: 'bg-cyan-500', icon: '🎨' },
    TestingAgent: { bg: 'bg-yellow-500/10', text: 'text-yellow-300', dot: 'bg-yellow-500', icon: '🧪' },
    AutoHealer: { bg: 'bg-orange-500/10', text: 'text-orange-300', dot: 'bg-orange-500', icon: '🔧' },
    Dockerizer: { bg: 'bg-sky-500/10', text: 'text-sky-300', dot: 'bg-sky-500', icon: '🐳' },
    CICDAgent: { bg: 'bg-rose-500/10', text: 'text-rose-300', dot: 'bg-rose-500', icon: '🚀' },
    DeploymentAgent: { bg: 'bg-indigo-500/10', text: 'text-indigo-300', dot: 'bg-indigo-500', icon: '📦' },
    System: { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-500', icon: '⚡' },
};

const getAgentStyle = (agent: string) =>
    AGENT_PALETTE[agent] ?? { bg: 'bg-white/5', text: 'text-white/60', dot: 'bg-white/40', icon: '🤖' };

// ── Types ────────────────────────────────────────────────────────────────────
interface AgentTimelineEvent {
    id: string;
    agent: string;
    action: string;
    message: string;
    timestamp: number;
    durationMs?: number;
    isFinished?: boolean;
}

interface Props {
    executionId: string;
    /** If true the build is done — SSE will self-close, show "Complete" banner */
    isCompleted?: boolean;
}

// ── Helper: ms → human-readable ─────────────────────────────────────────────
function humanDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AgentTimeline({ executionId, isCompleted }: Props) {
    const [events, setEvents] = useState<AgentTimelineEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const esRef = useRef<EventSource | null>(null);

    const addEvent = useCallback((raw: Record<string, unknown>) => {
        if (raw.type !== 'agent') return;

        const action = String(raw.action || '');
        const isFinish = action.endsWith(':finished');
        const baseAction = action.replace(/:started$|:finished$/, '');

        setEvents(prev => {
            if (isFinish) {
                // Patch the matching start event with duration & finished flag
                return prev.map(e =>
                    e.agent === raw.agent && e.action === `${baseAction}:started`
                        ? {
                            ...e, durationMs: Number(raw.durationMs) || 0, isFinished: true,
                            message: String(raw.message || e.message)
                        }
                        : e
                );
            }
            return [
                ...prev,
                {
                    id: `${raw.agent}-${raw.timestamp ?? Date.now()}-${Math.random()}`,
                    agent: String(raw.agent || 'System'),
                    action,
                    message: String(raw.message || ''),
                    timestamp: Number(raw.timestamp ?? Date.now()),
                    durationMs: raw.durationMs ? Number(raw.durationMs) : undefined,
                    isFinished: false,
                }
            ];
        });
    }, []);

    useEffect(() => {
        if (!executionId) return;

        const url = `/api/build/events?executionId=${executionId}&lastId=0`;
        const es = new EventSource(url);
        esRef.current = es;

        es.onopen = () => setConnected(true);
        es.onerror = () => setConnected(false);
        es.onmessage = (ev) => {
            try { addEvent(JSON.parse(ev.data)); } catch { /* skip */ }
        };

        return () => { es.close(); esRef.current = null; };
    }, [executionId, addEvent]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events.length]);

    const isEmpty = events.length === 0;

    return (
        <div className="flex flex-col h-full bg-[#040404] font-mono text-sm select-none">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/30 shrink-0">
                <div className="flex items-center gap-2.5">
                    <Zap size={13} className="text-amber-400" />
                    <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white/60">
                        Agent Activity Timeline
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isCompleted ? (
                        <span className="flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase text-emerald-400">
                            <CheckCircle size={10} /> Build complete
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase text-white/30">
                            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            {connected ? 'Live' : 'Connecting…'}
                        </span>
                    )}
                    <span className="text-[9px] text-white/20">{events.length} events</span>
                </div>
            </div>

            {/* Timeline body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-1.5">
                {isEmpty && (
                    <div className="flex flex-col items-center justify-center h-32 gap-3 opacity-40">
                        <Loader size={20} className="text-white/20 animate-spin" />
                        <span className="text-[10px] text-white/30 uppercase tracking-widest">
                            Waiting for agent activity…
                        </span>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {events.map((ev) => {
                        const style = getAgentStyle(ev.agent);
                        const isRunning = !ev.isFinished && !ev.action.endsWith(':finished');
                        const hasFinish = ev.isFinished && ev.durationMs !== undefined;

                        return (
                            <motion.div
                                key={ev.id}
                                initial={{ opacity: 0, x: -16, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className={`flex items-start gap-3 px-3 py-2 rounded-lg border border-white/[0.04] ${style.bg} group`}
                            >
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center shrink-0 pt-0.5">
                                    <div className={`w-2 h-2 rounded-full ${hasFinish ? style.dot : isRunning ? `${style.dot} animate-pulse` : 'bg-white/20'}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Timestamp */}
                                        <span className="text-[9px] text-white/25 tabular-nums shrink-0">
                                            {new Date(ev.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                                        </span>

                                        {/* Agent badge */}
                                        <span className={`text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md ${style.bg} ${style.text} border border-white/5 shrink-0`}>
                                            {getAgentStyle(ev.agent).icon} {ev.agent}
                                        </span>

                                        {/* Duration badge */}
                                        {hasFinish && ev.durationMs! > 0 && (
                                            <span className="flex items-center gap-0.5 text-[9px] text-white/30 tabular-nums">
                                                <Clock size={8} />
                                                {humanDuration(ev.durationMs!)}
                                            </span>
                                        )}

                                        {/* Spinner for running */}
                                        {isRunning && (
                                            <Loader size={9} className={`${style.text} animate-spin shrink-0 opacity-70`} />
                                        )}
                                    </div>

                                    {/* Message */}
                                    <p className="text-[11px] text-white/60 leading-snug mt-0.5 truncate">
                                        {ev.message}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                <div ref={bottomRef} />
            </div>
        </div>
    );
}
