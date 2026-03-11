"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Terminal as TerminalIcon, Sparkles } from 'lucide-react';

interface Thought {
    agent: string;
    message: string;
    timestamp: string;
}

interface ThoughtStreamProps {
    executionId: string;
    initialThoughts?: Thought[];
}

export const ThoughtStream: React.FC<ThoughtStreamProps> = ({ executionId, initialThoughts = [] }) => {
    const [thoughts, setThoughts] = useState<Thought[]>(initialThoughts);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!executionId) return;

        // Connect to SSE for real-time thoughts
        const eventSource = new EventSource(`/api/build/events?executionId=${executionId}`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.metadata?.agentThoughts) {
                setThoughts(data.metadata.agentThoughts);
            }
        };

        return () => eventSource.close();
    }, [executionId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [thoughts]);

    return (
        <div className="flex flex-col h-full bg-[#050505] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-500/10 rounded-lg">
                        <Brain size={14} className="text-violet-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Live Agent Cognition</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-violet-500 animate-ping" />
                        <div className="w-1 h-1 rounded-full bg-violet-500" />
                    </div>
                    <span className="text-[8px] font-bold text-violet-400/50 uppercase tracking-widest">Streaming</span>
                </div>
            </div>

            {/* Content */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
            >
                <AnimatePresence initial={false}>
                    {thoughts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-2">
                            <TerminalIcon size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Waiting for neural activity...</span>
                        </div>
                    ) : (
                        thoughts.map((thought, idx) => (
                            <motion.div
                                key={`${thought.timestamp}-${idx}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex gap-3 items-start group"
                            >
                                <div className="mt-1 w-5 h-5 rounded-md bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-violet-500/30 transition-colors">
                                    <Sparkles size={10} className="text-white/40 group-hover:text-violet-400" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-violet-400 uppercase tracking-tight">{thought.agent}</span>
                                        <span className="text-[8px] font-medium text-white/20 tabular-nums">
                                            {new Date(thought.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-gray-400 font-medium">
                                        {thought.message}
                                    </p>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-end">
                <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.3em]">Quantum-Neural-Bridge v2.1</span>
            </div>
        </div>
    );
};
