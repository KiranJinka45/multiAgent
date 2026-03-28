"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Loader2,
    Terminal
} from 'lucide-react';
import { BuildUpdate } from '@packages/contracts';

interface BuildDebugPanelProps {
    buildProgress: BuildUpdate | null;
}

const STALL_TIMEOUT_MS = 60000; // 60 seconds

const BuildDebugPanel: React.FC<BuildDebugPanelProps> = ({ buildProgress }) => {
    const { stages = [] } = buildProgress || {};
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
        <div className="flex-1 flex flex-col bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden h-full">
            <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-primary" />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Pipeline Orchestration</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-green-500 uppercase tracking-tighter">Live Trace</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {stages.map((stage) => {
                    const isStalled = stalledStages[stage.id];
                    const isPast = stage.status === 'completed';
                    const isCurrent = stage.status === 'in_progress';

                    return (
                        <div key={stage.id} className="space-y-1.5">
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: isPast ? '100%' : (isCurrent ? `${stage.progressPercent}%` : '0%') }}
                                    className={`h-full ${isPast ? 'bg-green-500' : isCurrent ? 'bg-primary' : 'bg-transparent'}`}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-[9px] font-black uppercase tracking-tight truncate ${isPast ? 'text-green-500' : isCurrent ? 'text-white' : 'text-white/20'}`}>
                                        {stage.name}
                                    </span>
                                    {isStalled && (
                                        <span className="px-1 py-0.5 bg-red-500/20 text-red-500 text-[7px] font-black rounded border border-red-500/20">STALLED</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isCurrent && <Loader2 size={10} className="animate-spin text-primary" />}
                                    {isPast && <CheckCircle2 size={10} className="text-green-500" />}
                                    <span className="text-[8px] font-mono text-white/20 tabular-nums">
                                        {isPast ? 'DONE' : isCurrent ? `${stage.progressPercent}%` : 'WAIT'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BuildDebugPanel;
