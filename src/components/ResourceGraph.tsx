'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, DollarSign, TrendingUp, BarChart2 } from 'lucide-react';

interface BuildMetric {
    id: string;
    tokens_used: number;
    duration_ms: number;
    cost_usd: number;
    created_at: string;
    status: string;
}

interface ResourceGraphProps {
    projectId: string;
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

function formatDuration(ms: number) {
    const s = Math.round(ms / 1000);
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

function formatCost(usd: number) {
    return usd < 0.01 ? '<$0.01' : `$${usd.toFixed(3)}`;
}

function formatK(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

interface MiniChartProps {
    data: number[];
    color: string;
    label: string;
    formatValue: (v: number) => string;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, color, label, formatValue }) => {
    const width = 240;
    const height = 70;
    const padX = 8;
    const padY = 8;

    if (!data || data.length < 2) {
        return (
            <div className="flex items-center justify-center h-[70px] text-gray-700 text-xs">
                Not enough data
            </div>
        );
    }

    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((v, i) => {
        const x = padX + (i / (data.length - 1)) * (width - padX * 2);
        const y = height - padY - ((v - min) / range) * (height - padY * 2);
        return { x, y, v };
    });

    // SVG path: area fill + line
    const lineD = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(' ');
    const areaD = `${lineD} L${points[points.length - 1].x.toFixed(1)},${height - padY} L${points[0].x.toFixed(1)},${height - padY} Z`;

    const lastVal = data[data.length - 1];

    return (
        <div>
            <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[9px] text-gray-600 uppercase tracking-widest">{label}</span>
                <span className="text-xs font-bold" style={{ color }}>{formatValue(lastVal)}</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.03" />
                    </linearGradient>
                </defs>
                {/* Area */}
                <motion.path
                    d={areaD}
                    fill={`url(#grad-${label})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                />
                {/* Line */}
                <motion.path
                    d={lineD}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                {/* Dots */}
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} opacity={0.8} />
                ))}
            </svg>
        </div>
    );
};

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    color: string;
}> = ({ icon, label, value, sub, color }) => (
    <div
        className="flex flex-col gap-1 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]"
        style={{ boxShadow: `0 0 20px -8px ${color}33` }}
    >
        <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
            <span style={{ color }}>{icon}</span>
            {label}
        </div>
        <p className="text-2xl font-black text-white tracking-tight">{value}</p>
        <p className="text-xs text-gray-600">{sub}</p>
    </div>
);

const ResourceGraph: React.FC<ResourceGraphProps> = ({ projectId }) => {
    const [metrics, setMetrics] = useState<BuildMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        fetch(`/api/usage-metrics/${projectId}`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setMetrics(data);
                else throw new Error(data?.error || 'Failed to load metrics');
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-600 gap-3 flex-col">
                <BarChart2 className="w-8 h-8 opacity-30 animate-pulse" />
                <span className="text-xs">Loading resource data…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center text-red-400/60 gap-3 flex-col">
                <BarChart2 className="w-8 h-8 opacity-40" />
                <span className="text-xs">Failed to load metrics: {error}</span>
            </div>
        );
    }

    if (metrics.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-600 gap-3 flex-col">
                <BarChart2 className="w-8 h-8 opacity-20" />
                <span className="text-xs">No build data yet for this project.</span>
            </div>
        );
    }

    const tokenData = metrics.map(m => m.tokens_used || 0);
    const durationData = metrics.map(m => m.duration_ms || 0);
    const costData = metrics.map(m => m.cost_usd || 0);

    const totalTokens = tokenData.reduce((a, b) => a + b, 0);
    const avgDuration = durationData.reduce((a, b) => a + b, 0) / (durationData.length || 1);
    const totalCost = costData.reduce((a, b) => a + b, 0);
    const successRate = metrics.filter(m => m.status === 'completed').length / metrics.length * 100;

    return (
        <div className="flex-1 overflow-y-auto bg-[#050505] p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Title */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-violet-500/15 rounded-lg border border-violet-500/20">
                        <TrendingUp className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Resource Consumption</h2>
                        <p className="text-[10px] text-gray-600">Last {metrics.length} build{metrics.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard
                        icon={<Zap className="w-3.5 h-3.5" />}
                        label="Total Tokens"
                        value={formatK(totalTokens)}
                        sub="across all builds"
                        color="#a78bfa"
                    />
                    <StatCard
                        icon={<Clock className="w-3.5 h-3.5" />}
                        label="Avg Duration"
                        value={formatDuration(avgDuration)}
                        sub="per build"
                        color="#38bdf8"
                    />
                    <StatCard
                        icon={<DollarSign className="w-3.5 h-3.5" />}
                        label="Total Cost"
                        value={formatCost(totalCost)}
                        sub="USD estimated"
                        color="#34d399"
                    />
                    <StatCard
                        icon={<BarChart2 className="w-3.5 h-3.5" />}
                        label="Success Rate"
                        value={`${successRate.toFixed(0)}%`}
                        sub={`${metrics.filter(m => m.status === 'completed').length}/${metrics.length} builds`}
                        color="#fb923c"
                    />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                        <MiniChart
                            data={tokenData}
                            color="#a78bfa"
                            label="Tokens per Build"
                            formatValue={v => formatK(v) + ' tok'}
                        />
                    </div>
                    <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                        <MiniChart
                            data={durationData.map(d => d / 1000)}
                            color="#38bdf8"
                            label="Duration (s) per Build"
                            formatValue={v => `${v.toFixed(0)}s`}
                        />
                    </div>
                    <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                        <MiniChart
                            data={costData}
                            color="#34d399"
                            label="Cost (USD) per Build"
                            formatValue={formatCost}
                        />
                    </div>
                </div>

                {/* Build history table */}
                <div className="rounded-xl border border-white/[0.07] overflow-hidden">
                    <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.07]">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Build History</p>
                    </div>
                    <table className="w-full text-xs text-gray-400">
                        <thead>
                            <tr className="border-b border-white/[0.05] text-[9px] text-gray-600 uppercase tracking-widest">
                                <td className="px-4 py-2">Time</td>
                                <td className="px-4 py-2 text-right">Tokens</td>
                                <td className="px-4 py-2 text-right">Duration</td>
                                <td className="px-4 py-2 text-right">Cost</td>
                                <td className="px-4 py-2 text-right">Status</td>
                            </tr>
                        </thead>
                        <tbody>
                            {[...metrics].reverse().map(m => (
                                <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-2 text-gray-600 tabular-nums">
                                        {new Date(m.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-2 text-right text-violet-300 tabular-nums">{formatK(m.tokens_used || 0)}</td>
                                    <td className="px-4 py-2 text-right text-sky-300 tabular-nums">{formatDuration(m.duration_ms || 0)}</td>
                                    <td className="px-4 py-2 text-right text-emerald-300 tabular-nums">{formatCost(m.cost_usd || 0)}</td>
                                    <td className="px-4 py-2 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${m.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                                m.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-yellow-500/10 text-yellow-400'
                                            }`}>{m.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ResourceGraph;
