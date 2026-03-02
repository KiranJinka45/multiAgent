"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Terminal,
    Loader2,
    CheckCircle2,
    Clock,
    Info,
    Layout,
    Database,
    Server,
    Box,
    Rocket
} from 'lucide-react';
import { BuildUpdate } from '../types/build';
import { formatTime } from '@/lib/date';

interface BuildConsoleProps {
    buildProgress: BuildUpdate | null;
}

const BuildConsole: React.FC<BuildConsoleProps> = ({ buildProgress }) => {
    const [logs, setLogs] = useState<{ id: string, text: string, type: 'info' | 'success', timestamp: string }[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMsgRef = useRef<string | null>(null);
    const prevLogsCount = useRef(0);

    // Ingest logs with append-only strategy and throttling
    useEffect(() => {
        if (buildProgress?.message && buildProgress.message !== lastMsgRef.current) {
            lastMsgRef.current = buildProgress.message;

            const newLog: { id: string, text: string, type: 'info' | 'success', timestamp: string } = {
                id: `log-${Date.now()}-${prevLogsCount.current++}`,
                text: buildProgress.message!,
                type: buildProgress.status === 'completed' ? 'success' : 'info',
                timestamp: formatTime(new Date())
            };

            React.startTransition(() => {
                setLogs(prev => {
                    // Avoid duplicate messages if they happen rapidly
                    if (prev.length > 0 && prev[prev.length - 1].text === newLog.text) return prev;
                    return [...prev, newLog].slice(-200); // Increased buffer to 200 logs
                });
            });
        }
    }, [buildProgress?.message, buildProgress?.status]);

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
    }, [buildProgress, visualProgress?.currentStageIndex]);

    const stages = useMemo(() => visualProgress?.stages || [], [visualProgress?.stages]);

    const getStageIcon = (id: string, status: string) => {
        if (status === 'in_progress') return <Loader2 size={16} className="text-primary animate-spin" />;
        if (status === 'completed') return <CheckCircle2 size={16} className="text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />;

        const i = id.toLowerCase();
        if (i.includes('database')) return <Database size={16} />;
        if (i.includes('backend')) return <Server size={16} />;
        if (i.includes('frontend')) return <Layout size={16} />;
        if (i.includes('docker')) return <Box size={16} />;
        if (i.includes('cicd')) return <Clock size={16} />;
        if (i.includes('deployment')) return <Rocket size={16} />;

        return <Info size={16} />;
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 p-8 space-y-8 h-full overflow-hidden">
            {/* Build Status Card */}
            <div className="flex items-center justify-between bg-white/[0.02] p-6 rounded-3xl border border-white/5 panel-depth">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest rounded-md border border-primary/20">Active Node</span>
                        <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                            <Terminal size={22} className="text-primary" />
                            Build Control Plane
                        </h2>
                    </div>
                    <p className="text-xs text-white/30 font-medium ml-8">Orchestrating multi-agent workforce clusters...</p>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Deployment Health</p>
                        <p className="text-2xl font-black text-primary tabular-nums">
                            {visualProgress?.status === 'completed' ? 100 : (visualProgress?.totalProgress || 0)}%
                        </p>
                    </div>
                    <div className="w-48 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${visualProgress?.status === 'completed' ? 100 : (visualProgress?.totalProgress || 0)}%` }}
                            className="h-full bg-primary shadow-[0_0_20px_rgba(59,130,246,0.6)] relative z-10"
                        />
                        <div className="absolute inset-0 shimmer opacity-20" />
                    </div>
                </div>
            </div>

            {/* Main Grid: Timeline + Console */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-hidden">
                {/* Timeline Panel */}
                <div className="lg:col-span-4 glass-panel rounded-3xl flex flex-col overflow-hidden active-border-glow">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40">
                        <span className="text-[10px] font-black tracking-widest uppercase text-white/40">Build Pipeline</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-white/20">REVISION: V1.0.4</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                        {stages.map((stage, idx) => (
                            <div key={stage.id} className="relative group">
                                <div className="flex items-start gap-4">
                                    <div className={`
                    w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-700 relative z-10
                    ${stage.status === 'completed' ? 'bg-green-500/5 border-green-500/20 text-green-500' :
                                            stage.status === 'in_progress' ? 'bg-primary/5 border-primary/40 text-primary animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.15)]' :
                                                'bg-white/[0.02] border-white/5 text-white/20'}
                  `}>
                                        {getStageIcon(stage.id, stage.status)}
                                        {stage.status === 'in_progress' && (
                                            <motion.div
                                                layoutId="active-stage-glow"
                                                className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 py-1">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <h4 className={`text-[11px] font-black tracking-tight transition-colors ${stage.status === 'pending' ? 'text-white/10' : 'text-gray-100'}`}>
                                                {stage.name.toUpperCase()}
                                            </h4>
                                            {stage.status === 'in_progress' && (
                                                <span className="text-[10px] font-mono text-primary font-black animate-pulse">{stage.progressPercent}%</span>
                                            )}
                                        </div>
                                        <p className={`text-[10px] transition-colors line-clamp-1 ${stage.status === 'pending' ? 'text-white/5' : 'text-white/30'} font-medium`}>
                                            {stage.status === 'completed' ? 'Sub-system validation passed' :
                                                stage.status === 'in_progress' ? stage.message :
                                                    'Awaiting upstream artifacts...'}
                                        </p>
                                    </div>
                                </div>
                                {/* Connection Line */}
                                {idx < stages.length - 1 && (
                                    <div className={`
                    absolute left-5 top-10 w-[1px] h-6 bg-white/5 transition-colors
                    ${stage.status === 'completed' ? 'bg-green-500/20' : ''}
                  `} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Console Panel */}
                <div className="lg:col-span-8 glass-panel rounded-3xl flex flex-col overflow-hidden relative active-border-glow">
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
                        className="flex-1 overflow-y-auto p-8 font-mono-tight space-y-2.5 text-[11px] leading-relaxed custom-scrollbar relative z-10"
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
