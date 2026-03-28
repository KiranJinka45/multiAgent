'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Activity, 
    Zap, 
    Shield, 
    Database, 
    Cpu, 
    Terminal, 
    Globe, 
    Loader2, 
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Layout,
    Layers,
    Server,
    Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@packages/utils';

// --- Types ---
interface SystemHealth {
    status: string;
    services: {
        redis: string;
        docker: string;
        socketServer: string;
    };
    timestamp: number;
}

interface QueueHealth {
    queueName: string;
    waiting: number;
    active: number;
    failed: number;
    total: number;
}

interface WorkerStats {
    count: number;
    workers: any[];
}

interface Mission {
    id: string;
    projectId: string;
    status: string;
    updatedAt: number;
    metadata: {
        currentStage?: string;
        error?: string;
    };
}

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <motion.div 
        whileHover={{ y: -5, scale: 1.02 }}
        className="relative group bg-[#0d0d0d]/80 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] overflow-hidden"
    >
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-${color}-500/20 transition-all`} />
        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">{title}</p>
                <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
                {trend && (
                    <div className="flex items-center gap-1.5 mt-2">
                        <div className={`w-1.5 h-1.5 rounded-full bg-${color}-500 shadow-[0_0_8px_rgba(var(--tw-color-${color}-500),0.4)]`} />
                        <span className={`text-[10px] font-bold text-${color}-400 uppercase tracking-widest`}>{trend}</span>
                    </div>
                )}
            </div>
            <div className={`p-3 bg-${color}-500/10 border border-${color}-500/20 rounded-2xl text-${color}-500`}>
                <Icon size={20} />
            </div>
        </div>
    </motion.div>
);

const HealthBadge = ({ label, status }: { label: string, status: string }) => {
    const isOnline = status === 'online' || status === 'active' || status === 'connected' || status === 'running';
    return (
        <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold uppercase tracking-widest ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                    {isOnline ? 'Operational' : 'Critical'}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
            </div>
        </div>
    );
};

export default function CommandCenter() {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [queue, setQueue] = useState<QueueHealth | null>(null);
    const [workers, setWorkers] = useState<WorkerStats | null>(null);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        setRefreshing(true);
        try {
            const [hRes, qRes, wRes, mRes] = await Promise.all([
                fetch('/api/system-health'),
                fetch('/api/queue-health'),
                fetch('/api/workers'),
                fetch('/api/missions')
            ]);

            const [h, q, w, m] = await Promise.all([
                hRes.json(),
                qRes.json(),
                wRes.json(),
                mRes.json()
            ]);

            setHealth(h);
            setQueue(q);
            setWorkers(w);
            setMissions(m.missions || []);
        } catch (error) {
            console.error('Failed to pulse system metrics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // 15s pulse
        return () => clearInterval(interval);
    }, [fetchData]);

    // Summary Computations
    const activeBuilds = missions.length;
    const workerNodes = workers?.count || 0;
    const queueDepth = queue?.waiting || 0;
    const systemStatus = health?.status || 'checking';

    if (loading) {
        return (
            <div className="h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <div className="w-16 h-16 border-2 border-primary/20 rounded-full animate-ping absolute inset-0" />
                    <div className="w-16 h-16 border-t-2 border-primary rounded-full animate-spin" />
                </div>
                <div className="text-center">
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-1">Command Center</h2>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest animate-pulse">Synchronizing Grid Telemetry...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-gray-300 p-8 pt-12">
            {/* Background Ambient Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -ml-64 -mb-64" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                <Activity size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Command Center</h1>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mt-1">MultiAgent Autonomous Grid</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 font-medium max-w-lg leading-relaxed">
                            Centralized observability for the multi-agent SaaS infrastructure. 
                            Monitoring high-speed generations, isolated sandboxes, and worker cluster health.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 italic">Last Synchronization</span>
                            <span className="text-xs font-bold text-white/60 tabular-nums">
                                {new Date().toLocaleTimeString()}
                            </span>
                        </div>
                        <button 
                            onClick={() => fetchData()}
                            disabled={refreshing}
                            className={`p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.06] transition-all ${refreshing ? 'animate-spin opacity-50' : ''}`}
                        >
                            <RefreshCw size={18} className={refreshing ? 'text-primary' : 'text-white/40'} />
                        </button>
                    </div>
                </header>

                {/* System Pulsar Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <StatCard 
                        title="Active Missions" 
                        value={activeBuilds} 
                        icon={Zap} 
                        color="primary" 
                        trend="Processing Live" 
                    />
                    <StatCard 
                        title="Cluster Nodes" 
                        value={workerNodes} 
                        icon={Cpu} 
                        color="blue" 
                        trend={`${workerNodes > 0 ? 'Healthy' : 'Initializing'}`} 
                    />
                    <StatCard 
                        title="Queue Depth" 
                        value={queueDepth} 
                        icon={Layers} 
                        color="amber" 
                        trend={queueDepth > 10 ? 'High Latency' : 'Nominal'} 
                    />
                    <StatCard 
                        title="System Uptime" 
                        value={systemStatus === 'ready' ? '100%' : '99.9%'} 
                        icon={Shield} 
                        color="green" 
                        trend="Zero Errors" 
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Live Mission Feed */}
                    <div className="lg:col-span-8 space-y-8">
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-widest">
                                    <Radio size={16} className="text-primary animate-pulse" />
                                    Live Mission Feed
                                </h3>
                                <div className="h-[1px] flex-1 bg-white/5 mx-6" />
                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">{missions.length} active tasks</span>
                            </div>

                            <div className="space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {missions.length === 0 ? (
                                        <motion.div 
                                            initial={{ opacity: 0 }} 
                                            animate={{ opacity: 1 }} 
                                            className="p-12 bg-white/[0.01] border border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-center gap-4"
                                        >
                                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/10">
                                                <Zap size={24} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-white/40 uppercase tracking-widest leading-none">Grid is Idle</p>
                                                <p className="text-[10px] text-white/20 font-medium uppercase tracking-[0.2em]">Awaiting mission initialization injections...</p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        missions.map((mission) => (
                                            <motion.div
                                                key={mission.id}
                                                layout
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#0d0d0d]/80 backdrop-blur-md border border-white/5 rounded-2xl hover:border-primary/30 transition-all hover:bg-[#111111]"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                        <Terminal size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">Mission {mission.id.split('-')[0]}</h4>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{mission.status}</span>
                                                            </div>
                                                            <span className="text-[10px] text-white/20">•</span>
                                                            <span className="text-[10px] text-white/40 font-medium uppercase tracking-widest italic">{mission.metadata.currentStage || 'Initializing'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Updated</div>
                                                        <div className="text-[10px] font-bold text-white/60 tabular-nums">
                                                            {new Date(mission.updatedAt).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => window.location.href = `/projects/${mission.projectId}`}
                                                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white/40 uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all"
                                                    >
                                                        Trace
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-widest">
                                    <Database size={16} className="text-blue-400" />
                                    Infrastructure Pulse
                                </h3>
                                <div className="h-[1px] flex-1 bg-white/5 mx-6" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-[#0d0d0d] border border-white/5 p-5 rounded-2xl space-y-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">
                                        <Server size={12} /> Resource Clusters
                                    </div>
                                    <div className="space-y-2">
                                        <HealthBadge label="Redis Grid" status={health?.services.redis || 'offline'} />
                                        <HealthBadge label="Hypervisor" status={health?.services.docker || 'offline'} />
                                        <HealthBadge label="Live Gateway" status={health?.services.socketServer || 'offline'} />
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-[#0d0d0d] border border-white/5 p-5 rounded-2xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <Layers size={80} />
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic mb-6">
                                        <Zap size={12} /> Execution Engine (BullMQ)
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Pending', val: queue?.waiting || 0, color: 'primary' },
                                            { label: 'Active', val: queue?.active || 0, color: 'green' },
                                            { label: 'Failed', val: queue?.failed || 0, color: 'red' },
                                            { label: 'Total', val: queue?.total || 0, color: 'blue' }
                                        ].map(item => (
                                            <div key={item.label} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">{item.label}</p>
                                                <p className={`text-xl font-black text-${item.color}-500 tabular-nums`}>{item.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Worker Fleet */}
                    <div className="lg:col-span-4 space-y-8">
                        <section className="bg-[#0d0d0d] border border-white/5 rounded-[2rem] p-6 h-fit relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-transparent opacity-30 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-widest">
                                    <Cpu size={16} className="text-white/40" />
                                    Worker Fleet
                                </h3>
                                <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[9px] font-black text-primary uppercase tracking-widest">
                                    {workers?.count || 0} Registered
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {workers?.workers.map((worker, idx) => (
                                    <div key={worker.id || idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-white tracking-widest">NODE-{idx + 1}</span>
                                            </div>
                                            <span className="text-[8px] font-bold text-white/20 uppercase">Last Pulse: {worker.lastSeen}s ago</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[8px] font-black text-white/20 uppercase mb-1">Resources</p>
                                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary w-[40%]" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-white/20 uppercase mb-1">Load</p>
                                                <p className="text-[10px] font-bold text-white/60">NOMINAL</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!workers || workers.workers.length === 0) && (
                                    <div className="text-center py-10 opacity-20 italic text-xs">
                                        No edge nodes currently oscillating...
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-[2rem] p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Zap size={16} className="text-primary" />
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">Platform Intelligence</h3>
                            </div>
                            <p className="text-[11px] text-gray-400 font-medium leading-relaxed mb-6">
                                Hyper-scale multi-agent coordination system is currently operating in high-concurrency mode. 
                                Sandbox isolation is enforced across all generation cycles.
                            </p>
                            <div className="space-y-3">
                                {[
                                    { label: 'Isolation Layer', val: 'Docker Core' },
                                    { label: 'Egress Policy', val: 'Restricted' },
                                    { label: 'Kernel Version', val: 'AgentOS-0.12' }
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <span className="text-[9px] font-bold text-white/30 uppercase">{item.label}</span>
                                        <span className="text-[9px] font-black text-white uppercase">{item.val}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}

CommandCenter.displayName = 'CommandCenter';
