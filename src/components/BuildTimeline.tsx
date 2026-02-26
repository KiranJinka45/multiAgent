'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    Loader2,
    Circle,
    XCircle,
    Sparkles,
    Timer,
    RefreshCcw
} from 'lucide-react';
import { BuildUpdate, BuildStage } from '@/types/build';

interface BuildTimelineProps {
    data: BuildUpdate | null;
    onSync?: () => void;
}

export const BuildTimeline: React.FC<BuildTimelineProps> = ({ data, onSync }) => {
    const [showTroubleshoot, setShowTroubleshoot] = React.useState(false);

    React.useEffect(() => {
        if (!data) {
            const timer = setTimeout(() => setShowTroubleshoot(true), 20000); // 20s for Distributed Resilience
            return () => clearTimeout(timer);
        } else {
            setShowTroubleshoot(false);
        }
    }, [data]);

    if (!data) {
        return (
            <div className="w-full max-w-xl mx-auto space-y-4 p-6 bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl animate-in fade-in duration-500">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="relative">
                        <Loader2 size={32} className="text-primary animate-spin opacity-20" />
                        <Sparkles size={16} className="text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-[0.2em]">Initializing Engine</h3>
                        <p className="text-[10px] text-gray-500 font-medium max-w-xs mx-auto">
                            {showTroubleshoot
                                ? "Engineering stream connection timed out."
                                : "MultiAgent is establishing a persistent stream..."}
                        </p>
                    </div>

                    {showTroubleshoot ? (
                        <div className="space-y-3 animate-in zoom-in-95 duration-300">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-primary text-primary-foreground text-[10px] font-black rounded-lg hover:opacity-90 transition-all flex items-center gap-2 mx-auto uppercase tracking-widest"
                            >
                                <RefreshCcw size={12} /> Refresh Connection
                            </button>
                            <p className="text-[9px] text-gray-600 max-w-[200px] mx-auto leading-relaxed">
                                If issues persist, check your network or Supabase realtime settings.
                            </p>
                        </div>
                    ) : (
                        /* Placeholder Steps */
                        <div className="w-full space-y-2 opacity-20 filter blur-[1px]">
                            {[1, 2].map(i => (
                                <div key={i} className="h-8 bg-white/5 rounded-xl border border-white/5 flex items-center px-4 gap-4">
                                    <Circle size={14} className="text-gray-700" />
                                    <div className="h-1.5 w-20 bg-gray-800 rounded-full" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl mx-auto space-y-4 p-4 bg-[#0a0a0a]/50 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
            {/* Header & Overall Progress */}
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                            <Sparkles className="text-primary animate-pulse" size={16} />
                            {data.status === 'completed' ? 'Project Ready' : 'Engineering Build'}
                        </h2>
                        <p className="text-[9px] text-gray-500 font-medium uppercase tracking-widest leading-none">
                            ID: {data.executionId.split('-')[0]}...
                        </p>
                    </div>
                    <div className="text-right leading-none flex flex-col items-end gap-1">
                        <div className="text-2xl font-black text-primary tabular-nums">
                            {data.totalProgress}%
                        </div>
                        {onSync && (
                            <button
                                onClick={onSync}
                                className="text-[8px] text-gray-600 hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-tighter"
                                title="Force Sync Engineering Data"
                            >
                                <Timer size={8} /> Sync Now
                            </button>
                        )}
                    </div>
                </div>

                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary via-blue-500 to-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${data.totalProgress}%` }}
                        transition={{ type: "spring", stiffness: 50, damping: 20 }}
                    />
                </div>

                {data.message && (
                    <p className="text-[10px] text-gray-400 italic text-center animate-pulse leading-none">
                        "{data.message}"
                    </p>
                )}
            </div>

            {/* Stages Timeline */}
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {data.stages.map((stage, idx) => (
                    <StageItem key={stage.id} stage={stage} index={idx} />
                ))}
            </div>
        </div>
    );
};

const StageItem = ({ stage, index }: { stage: BuildStage; index: number }) => {
    const isCompleted = stage.status === 'completed';
    const isInProgress = stage.status === 'in_progress';
    const isFailed = stage.status === 'failed';
    const isPending = stage.status === 'pending';

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative flex items-center gap-3 p-2 rounded-xl border transition-all ${isInProgress ? 'bg-primary/5 border-primary/20 shadow-lg' : 'border-transparent'
                }`}
        >
            <div className="relative flex flex-col items-center">
                <div className={`z-10 bg-[#0a0a0a] rounded-full p-0.5`}>
                    {isCompleted && <CheckCircle2 size={14} className="text-green-500" />}
                    {isInProgress && <Loader2 size={14} className="text-primary animate-spin" />}
                    {isFailed && <XCircle size={14} className="text-red-500" />}
                    {isPending && <Circle size={14} className="text-gray-700" />}
                </div>
                {/* Connector Line */}
                {index < 9 && (
                    <div className={`absolute top-4 w-0.5 h-6 ${isCompleted ? 'bg-green-500/20' : 'bg-gray-800'}`} />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0">
                    <h4 className={`text-[11px] font-bold tracking-tight ${isCompleted ? 'text-gray-400' : isInProgress ? 'text-white' : 'text-gray-600'
                        }`}>
                        {stage.name}
                    </h4>
                    {isInProgress && (
                        <span className="text-[9px] font-black text-primary animate-pulse tabular-nums">
                            {stage.progressPercent}%
                        </span>
                    )}
                </div>
                <p className={`text-[9px] truncate leading-none ${isInProgress ? 'text-primary/70' : 'text-gray-500'
                    }`}>
                    {stage.message}
                </p>
            </div>

            {isInProgress && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <Sparkles size={24} className="text-primary" />
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};
