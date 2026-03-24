"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Terminal,
    Loader2
} from 'lucide-react';
import BuildDebugPanel from './BuildDebugPanel';
import { formatTime } from '@libs/utils';
import { BuildUpdate } from '@libs/contracts';

interface BuildConsoleProps {
    buildProgress: BuildUpdate | null;
    executionId?: string;
}

const BuildConsole: React.FC<BuildConsoleProps> = ({ buildProgress }) => {
    const [logs, setLogs] = useState<{ id: string, text: string, type: 'info' | 'success', timestamp: string }[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMsgRef = useRef<string | null>(null);
    const prevLogsCount = useRef(0);

    // Ingest logs with append-only strategy and throttling
    useEffect(() => {
        const update = buildProgress;
        if (!update) return;

        // 1. Process main status message
        if (update.message && update.message !== lastMsgRef.current) {
            lastMsgRef.current = update.message;
            addLog(update.message, update.status === 'completed' ? 'success' : 'info');
        }

        // 2. Process granular agent events (Layer 3 & 11)
        if (update.type === 'agent' && update.agent && update.action) {
            const agentMsg = `[${update.agent}] ${update.action.toUpperCase()}: ${update.message || ''}`;
            addLog(agentMsg, 'info');
        }
    }, [buildProgress]);

    const addLog = (text: string, type: 'info' | 'success') => {
        const newLog: { id: string, text: string, type: 'info' | 'success', timestamp: string } = {
            id: `log-${Date.now()}-${prevLogsCount.current++}`,
            text,
            type,
            timestamp: formatTime(new Date())
        };

        React.startTransition(() => {
            setLogs(prev => {
                if (prev.length > 0 && prev[prev.length - 1].text === newLog.text) return prev;
                return [...prev, newLog].slice(-200);
            });
        });
    };

    // Auto-scroll with debouncing
    useEffect(() => {
        const timer = setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [logs.length]);

    // Artificial Visual Queue Array to ensure 300ms min delay per stage
    const [visualProgress, setVisualProgress] = useState<BuildUpdate | null>(null);
    const updateQueue = useRef<BuildUpdate[]>([]);
    const isProcessingQueue = useRef(false);

    // Enforce linear 300ms minimal visual delay and STRICT INDEX PROGRESSION
    useEffect(() => {
        if (!buildProgress) return;

        // RULE: Ignore updates that regress stageIndex or are duplicates
        if (visualProgress && buildProgress.currentStageIndex < visualProgress.currentStageIndex) {
            console.warn(`[BuildConsole] Ignored out-of-order update: current=${visualProgress.currentStageIndex}, received=${buildProgress.currentStageIndex}`);
            return;
        }

        // Add to queue
        updateQueue.current.push(buildProgress);

        const processQueue = async () => {
            if (isProcessingQueue.current || updateQueue.current.length === 0) return;
            isProcessingQueue.current = true;

            while (updateQueue.current.length > 0) {
                const nextUpdate = updateQueue.current.shift();
                if (nextUpdate) {
                    // Double check index guard before setting state
                    setVisualProgress(prev => {
                        if (prev && nextUpdate.currentStageIndex < prev.currentStageIndex) return prev;
                        return nextUpdate;
                    });
                }
                // Minimum deterministic delay of 450ms (pacing) between visual stage updates
                await new Promise(resolve => setTimeout(resolve, 450));
            }

            isProcessingQueue.current = false;
        };

        processQueue();
    }, [buildProgress, visualProgress]);



    return (
        <div className="flex-1 flex flex-col min-w-0 p-4 space-y-4 h-full overflow-hidden">
            {/* COMPACT Build Status Header */}
            <div className="flex items-center justify-between bg-white/[0.02] p-3 px-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                    <Terminal size={14} className="text-primary" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-white/60">Live Grid Engine</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden relative">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${visualProgress?.status === 'completed' ? 100 : (visualProgress?.totalProgress || 0)}%` }}
                            className="h-full bg-primary"
                        />
                    </div>
                    <span className="text-[10px] font-black text-primary tabular-nums">
                        {visualProgress?.status === 'completed' ? 100 : (visualProgress?.totalProgress || 0)}%
                    </span>
                </div>
            </div>

            {/* Side-by-Side: Timeline(Small) + Console */}
            <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
                {/* Visual Timeline (Compact) */}
                <div className="h-40 shrink-0 border-b border-white/5 pb-4">
                    <BuildDebugPanel buildProgress={visualProgress} />
                </div>

                {/* Console Panel (Mainly filling the rest) */}
                <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden relative active-border-glow">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full agent-glow pointer-events-none opacity-40" />

                    <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/60 relative z-20">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/30" />
                            </div>
                            <div className="h-3 w-[1px] bg-white/10" />
                            <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-primary/60" />
                                <span className="text-[10px] font-black tracking-widest uppercase text-white/40">Kernel Stream</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-2 py-0.5 bg-white/5 rounded text-[8px] font-mono text-white/30">ID: STREAM-CLUSTER-09</div>
                        </div>
                    </div>

                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 font-mono-tight space-y-2 text-[10px] leading-relaxed custom-scrollbar relative z-10"
                    >
                        {logs.map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex gap-4 group"
                            >
                                <span className="text-white/10 tabular-nums select-none w-16">{log.timestamp}</span>
                                <span className="text-primary/40 select-none">❯</span>
                                <span className={`
                  ${log.type === 'success' ? 'text-green-400 font-bold' : 'text-gray-400'}
                  transition-colors group-hover:text-white
                `}>
                                    {log.text}
                                </span>
                            </motion.div>
                        ))}

                        {buildProgress?.status === 'queued' && (
                            <div className="flex gap-4 items-center pt-2">
                                <span className="text-white/10 w-16">···</span>
                                <div className="w-2 h-4 bg-yellow-500/40 animate-pulse" />
                                <span className="text-[9px] font-black text-yellow-500/80 uppercase tracking-widest">
                                    Awaiting Available Worker... {buildProgress.queuePosition ? `(Position: ${buildProgress.queuePosition})` : ''}
                                </span>
                            </div>
                        )}

                        {buildProgress?.status === 'executing' && (
                            <div className="flex gap-4 items-center pt-2">
                                <span className="text-white/10 w-16">···</span>
                                <div className="w-2 h-4 bg-primary/40 animate-pulse" />
                                <span className="text-[9px] font-black text-primary/30 uppercase tracking-widest">Awaiting sub-routine output...</span>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-black/60 border-t border-white/5 flex items-center justify-between relative z-20">
                        <div className="flex items-center gap-6 text-[9px] font-bold tracking-widest uppercase text-white/20">
                            <span className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Socket: Connected
                            </span>
                            <span className="flex items-center gap-2">
                                <Loader2 size={12} className="animate-spin" /> Load: 0.24ms
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-1 bg-primary/10 rounded-lg text-[8px] font-black text-primary border border-primary/20 tracking-tighter shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                SECURE-SHELL-V2
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(BuildConsole);
