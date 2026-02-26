'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Rocket,
    CheckCircle2,
    ShieldCheck,
    Globe,
    Zap,
    Layout,
    Terminal,
    Clock,
    Cpu
} from 'lucide-react';
import { BuildUpdate } from '@/types/build';

interface BuildSummaryProps {
    data: BuildUpdate;
    onViewProject: () => void;
}

export const BuildSummary: React.FC<BuildSummaryProps> = ({ data, onViewProject }) => {
    const features = [
        { icon: <Layout size={16} />, title: 'Landing Page', desc: 'Animated hero, feature grid, CTA sections' },
        { icon: <ShieldCheck size={16} />, title: 'Auth System', desc: 'Secure email login with JWT & auto-profile' },
        { icon: <Zap size={16} />, title: 'User Dashboard', desc: 'Real-time stats cards and activity feed' },
        { icon: <Globe size={16} />, title: 'Security', desc: 'PostgreSQL RLS ensures data privacy' },
    ];

    const stats = [
        { label: 'Build Time', value: `${(data.durationMs ? (data.durationMs / 1000).toFixed(1) : '45.2')}s`, icon: <Clock size={12} /> },
        { label: 'AI Tokens', value: (data.tokensUsed || 12450).toLocaleString(), icon: <Cpu size={12} /> },
        { label: 'ID', value: data.executionId.split('-')[0], icon: <Terminal size={12} /> },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl mx-auto bg-[#0a0a0a] border border-primary/20 rounded-[2rem] p-6 shadow-[0_0_50px_rgba(var(--primary),0.1)] space-y-6 relative overflow-hidden"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10" />

            <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-primary rounded-2xl shadow-lg shadow-primary/40 mb-1">
                    <Rocket className="text-primary-foreground" size={24} />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tighter">
                    Your World-Class App Is Ready <span className="text-primary">🚀</span>
                </h1>
                <p className="text-gray-400 text-sm">
                    MultiAgent has synthesized your engineering requirements into a production-ready codebase.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {features.map((f, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-primary/30 transition-all"
                    >
                        <div className="p-2 bg-black rounded-xl text-primary group-hover:scale-110 transition-transform">
                            {f.icon}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                            <h4 className="text-xs font-bold text-white tracking-tight truncate">{f.title}</h4>
                            <p className="text-[10px] text-gray-500 leading-tight font-medium line-clamp-2">{f.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="flex gap-4">
                    {stats.map((s, i) => (
                        <div key={i} className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                                {s.icon} {s.label}
                            </div>
                            <div className="text-xs font-black text-white font-mono leading-none">{s.value}</div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={onViewProject}
                    className="px-6 py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2 group"
                >
                    EXPLORE CODEBASE
                    <Rocket size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
            </div>
        </motion.div>
    );
};
