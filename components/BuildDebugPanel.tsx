"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    Circle,
    Loader2,
    AlertCircle,
    Clock,
    Terminal,
    ChevronDown,
    ChevronUp,
    XCircle,
    Zap,
    AlertTriangle,
    RefreshCcw
} from 'lucide-react';
import { BuildStage, BuildUpdate } from '@shared-types/build';

interface BuildDebugPanelProps {
    buildProgress: BuildUpdate | null;
}

const STALL_TIMEOUT_MS = 60000; // 60 seconds

const BuildDebugPanel: React.FC<BuildDebugPanelProps> = ({ buildProgress }) => {
    const { stages = [], isBackgroundBuilding = false } = buildProgress || {};
    const [expanded, setExpanded] = useState(true);
    const [stalledStages, setStalledStages] = useState<Record<string, boolean>>({});

    // Timeout detection for stalled builds
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const newStalled: Record<string, boolean> = {};

            stages.forEach(stage => {
                if (stage.status === 'in_progress') {
                    const stageStartTime = stage.startedAt ? new Date(stage.startedAt).getTime() : new Date(stage.timestamp).getTime();
                    if (now - stageStartTime > STALL_TIMEOUT_MS) {
                        newStalled[stage.id] = true;
                    }
                }
            });

            setStalledStages(newStalled);
        }, 5000);

        return () => clearInterval(interval);
    }, [stages]);

    if (!buildProgress) return null;

    return (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div
                className="p-4 flex items-center justify-between bg-white/[0.02] cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <Terminal size={18} className="text-primary" />
                    <h3 className="text-sm font-black text-white tracking-widest uppercase italic">Build Status Monitor</h3>
                </div>
                <div className="flex items-center gap-4">
                    {Object.keys(stalledStages).length > 0 && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-black text-red-500 uppercase animate-pulse">
                            <AlertCircle size={12} />
                            Stall Detected
                        </div>
                    )}
                    {expanded ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5"
                    >
                        <div className="p-4 space-y-3">
                            {stages.map((stage) => {
                                const isStalled = stalledStages[stage.id];
                                return (
                                    <div key={stage.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`
                                                w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-500
                                                ${stage.status === 'completed' ? 'bg-green-500/5 border-green-500/20 text-green-500' :
                                                    stage.status === 'in_progress' ? (isStalled ? 'bg-red-500/5 border-red-500/40 text-red-500' : 'bg-primary/5 border-primary/40 text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]') :
                                                        'bg-white/[0.02] border-white/5 text-white/10'}
                                            `}>
                                                {stage.status === 'completed' && <CheckCircle2 size={14} />}
                                                {stage.status === 'in_progress' && (isStalled ? <AlertCircle size={14} className="animate-pulse" /> : <Loader2 size={14} className="animate-spin" />)}
                                                {stage.status === 'pending' && <Circle size={14} />}
                                                {stage.status === 'failed' && <AlertCircle size={14} className="text-red-500" />}
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[11px] font-black tracking-tight ${stage.status === 'pending' ? 'text-white/10' : 'text-white'}`}>
                                                        {stage.name.toUpperCase()}
                                                    </span>
                                                    {isStalled && (
                                                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-500 text-[8px] font-black rounded border border-red-500/20">STALLED</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-white/30 font-medium truncate max-w-[200px]">
                                                    {stage.message || (stage.status === 'pending' ? 'Waiting...' : '')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {stage.status === 'in_progress' && (
                                                <span className="text-[10px] font-mono text-primary font-black tabular-nums">{stage.progressPercent}%</span>
                                            )}
                                            {stage.status === 'completed' && stage.completedAt && (
                                                <span className="text-[9px] font-mono text-white/20">DONE</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock size={12} className="text-white/20" />
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Global Watchdog Active</span>
                            </div>
                            <div className="px-2 py-0.5 bg-primary/10 rounded text-[9px] font-black text-primary border border-primary/20">
                                {buildProgress.totalProgress}% ADAPTIVE_SYNC
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Background Building Footer */}
            {isBackgroundBuilding && buildProgress.status !== 'completed' && (
                <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-[9px] font-black tracking-widest uppercase text-primary/60">
                        <span className="flex items-center gap-2">
                            <RefreshCcw size={10} className="animate-spin" />
                            Production deployment in background
                        </span>
                        <span className="tabular-nums">
                            {buildProgress.stages.find(s => s.status === 'in_progress')?.name || 'Optimizing binary'}...
                        </span>
                    </div>
                    <div className="w-full h-1 bg-primary/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="h-full bg-primary/20"
                        />
                    </div>
                    <p className="text-[10px] text-white/30 italic">
                        You can interact with the preview now. The live production image is being prepared.
                    </p>
                </div>
            )}
        </div>
    );
};

export default BuildDebugPanel;
