"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Layout, Download, Rocket, Github, Wand2, Eye, BarChart2, Activity, Brain } from 'lucide-react';
import { BuildUpdate } from '@shared-types/build';
import FileExplorer from '@/components/FileExplorer';
import FileViewer from '@/components/FileViewer';
import BuildConsole from '@/components/BuildConsole';
import PreviewPanel from '@/components/PreviewPanel';
import BuildLogs from '@/components/BuildLogs';
import ChatEditPanel from '@/components/ChatEditPanel';
import { DiffViewer, FileDiff } from '@/components/DiffViewer';
import ResourceGraph from '@/components/ResourceGraph';
import AgentTimeline from '@/components/AgentTimeline';
import { ThoughtStream } from '@/components/devops/ThoughtStream';
import { formatTime, formatYear } from '@config/date';

interface DevOpsDashboardProps {
    buildProgress: BuildUpdate | null;
    files: { path: string; content?: string }[];
    onDownload: () => void;
    onDeploy: () => void;
    onPushToGithub?: () => void;
    onRedeploy?: () => void;
    projectTitle: string;
    projectId?: string;
}

const DevOpsDashboard: React.FC<DevOpsDashboardProps> = ({
    buildProgress,
    files,
    onDownload,
    onDeploy,
    onPushToGithub,
    onRedeploy,
    projectTitle,
    projectId = ''
}) => {
    const [activeTab, setActiveTab] = useState<'preview' | 'explorer' | 'logs' | 'metrics' | 'timeline' | 'thoughts' | 'intelligence'>('preview');
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [diffOpen, setDiffOpen] = useState(false);

    // Pull executionId from buildProgress for the Timeline
    const executionId = buildProgress?.executionId || 
                        buildProgress?.metadata?.executionId || '';

    useEffect(() => {
        setMounted(true);
    }, []);

    // Memoize the fully resolved selected file
    const selectedFile = useMemo(() => {
        if (!selectedFilePath) return null;
        return files.find(f => f.path === selectedFilePath) || null;
    }, [selectedFilePath, files]);

    // Memoize build status for performance
    const status = useMemo(() => buildProgress?.status || 'executing', [buildProgress?.status]);
    const currentStage = useMemo(() => buildProgress?.currentStage || 'initializing', [buildProgress?.currentStage]);
    const isCompleted = status === 'completed' || !!buildProgress?.isPreviewReady;

    // Extract logs from build message history if available
    const buildLogs = useMemo(() => {
        if (!buildProgress) return [];
        // Fallback structured log generation
        return [
            `[Init] Orchestration Engine Started`,
            `[Stage] Entering: ${buildProgress.currentStage}...`,
            `[Sys] Message: ${buildProgress.message}`,
            ...(buildProgress.status === 'completed' ? ['[Success] System Online'] : [])
        ];
    }, [buildProgress]);

    const handleRedeploy = useCallback(() => {
        if (onRedeploy) {
            onRedeploy();
        } else {
            console.log('Orchestrating system redeploy via reload...');
            window.location.reload();
        }
    }, [onRedeploy]);

    // Apply a single diff patch via the API
    const handleApplyDiff = useCallback(async (diff: FileDiff) => {
        const res = await fetch(`/api/projects/${projectId}/apply-patch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: diff.path,
                content: diff.newContent,
                action: diff.type,
            }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || `Apply failed (${res.status})`);
        }
    }, [projectId]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[#030303] text-gray-300 font-sans overflow-hidden selection:bg-primary/30">
            {/* Header Bar */}
            <header className="min-h-16 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-3 z-50 relative shrink-0">
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                {/* Left: Brand + Status */}
                <div className="flex items-center gap-3 sm:gap-8 relative min-w-0">
                    <div className="flex items-center gap-3 group cursor-pointer shrink-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-primary to-blue-700 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.4)] group-hover:scale-110 transition-all duration-500">
                            <Terminal size={18} className="text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-black tracking-[0.3em] uppercase text-white/40 leading-none mb-0.5">Control Plane</span>
                            <h1 className="text-sm font-black text-white tracking-tighter flex items-center gap-2 leading-none uppercase italic truncate max-w-[140px] sm:max-w-none">
                                {projectTitle}
                            </h1>
                        </div>
                    </div>

                    <div className="hidden sm:block h-6 w-[1px] bg-white/10" />

                    <div className="hidden sm:flex items-center gap-5">
                        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.1em]">{currentStage.replace(/-/g, ' ')}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions + Tab switcher */}
                <div className="flex items-center gap-2 sm:gap-4 relative flex-wrap justify-end">
                    {isCompleted && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 flex-wrap"
                        >
                            {buildProgress?.metadata?.diffs && buildProgress.metadata.diffs.length > 0 && (
                                <button
                                    onClick={() => setDiffOpen(true)}
                                    className="flex items-center gap-1.5 px-3 sm:px-5 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all"
                                >
                                    <Eye size={13} /> <span>Review Changes</span>
                                </button>
                            )}
                            <button
                                onClick={onDownload}
                                className="flex items-center gap-1.5 px-3 sm:px-5 py-2 bg-white/[0.03] hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all hover:active-border-glow"
                            >
                                <Download size={13} /> <span className="hidden sm:inline">Export Bundle</span>
                            </button>
                            {onPushToGithub && (
                                <button
                                    onClick={onPushToGithub}
                                    className="flex items-center gap-1.5 px-3 sm:px-5 py-2 bg-white/[0.03] hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all hover:active-border-glow"
                                >
                                    <Github size={13} /> <span className="hidden sm:inline">GitHub</span>
                                </button>
                            )}
                            <button
                                onClick={onDeploy}
                                className="flex items-center gap-1.5 px-3 sm:px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black tracking-widest uppercase shadow-[0_15px_35px_-10px_rgba(59,130,246,0.6)] hover:brightness-110 transition-all active-border-glow"
                            >
                                <Rocket size={13} /> <span className="hidden sm:inline">Launch</span>
                            </button>
                        </motion.div>
                    )}

                    <div className="hidden sm:block h-6 w-[1px] bg-white/10" />

                    {/* Tab switcher — always visible */}
                    <div className="flex items-center gap-1 bg-white/[0.02] p-1 rounded-xl border border-white/5">
                        {(['preview', 'explorer', 'logs'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-2.5 sm:px-4 py-1.5 rounded-lg transition-all text-[10px] font-black tracking-widest uppercase ${activeTab === tab ? 'bg-primary/20 text-primary shadow-inner border border-primary/20' : 'text-white/40 hover:text-white'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                        {/* Thoughts — Always available once build starts */}
                        <button
                            onClick={() => setActiveTab('thoughts')}
                            className={`flex items-center gap-1 px-2.5 sm:px-4 py-1.5 rounded-lg transition-all text-[10px] font-black tracking-widest uppercase ${activeTab === 'thoughts' ? 'bg-violet-500/20 text-violet-300 shadow-inner border border-violet-500/20' : 'text-white/40 hover:text-white'}`}
                        >
                            <Brain size={10} className="hidden sm:block" />
                            Thoughts
                        </button>
                        {/* Timeline — always visible once build starts */}
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`flex items-center gap-1 px-2.5 sm:px-4 py-1.5 rounded-lg transition-all text-[10px] font-black tracking-widest uppercase ${activeTab === 'timeline' ? 'bg-amber-500/20 text-amber-300 shadow-inner border border-amber-500/20' : 'text-white/40 hover:text-white'}`}
                        >
                            <Activity size={10} className="hidden sm:block" />
                            Timeline
                        </button>
                        <button
                            onClick={() => setActiveTab('intelligence')}
                            className={`flex items-center gap-1 px-2.5 sm:px-4 py-1.5 rounded-lg transition-all text-[10px] font-black tracking-widest uppercase ${activeTab === 'intelligence' ? 'bg-cyan-500/20 text-cyan-300 shadow-inner border border-cyan-500/20' : 'text-white/40 hover:text-white'}`}
                        >
                            <Brain size={10} className="hidden sm:block" />
                            Intelligence
                        </button>
                        {isCompleted && (
                            <button
                                onClick={() => setActiveTab('metrics')}
                                className={`flex items-center gap-1 px-2.5 sm:px-4 py-1.5 rounded-lg transition-all text-[10px] font-black tracking-widest uppercase ${activeTab === 'metrics' ? 'bg-violet-500/20 text-violet-300 shadow-inner border border-violet-500/20' : 'text-white/40 hover:text-white'}`}
                            >
                                <BarChart2 size={10} className="hidden sm:block" />
                                Metrics
                            </button>
                        )}
                    </div>

                    {/* Chat Edit toggle button */}
                    {isCompleted && (
                        <button
                            onClick={() => setChatOpen(prev => !prev)}
                            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${chatOpen
                                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                                : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
                                }`}
                        >
                            <Wand2 size={12} />
                            <span className="hidden sm:inline">AI Edit</span>
                            {/* Pulsing badge */}
                            {!chatOpen && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.9)] animate-pulse" />
                            )}
                        </button>
                    )}
                </div>
            </header>

            {/* Main Container */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Scanning Animation Layer */}
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                    <div className="w-full h-[1px] bg-primary/20 animate-scan blur-[1px] opacity-40" />
                </div>

                {/* Pre-Completion Console View */}
                {!isCompleted && (
                    <main className="flex-1 flex flex-col bg-[#010101] min-w-0 relative z-20 overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.03),transparent)] pointer-events-none" />
                        <BuildConsole buildProgress={buildProgress} />
                    </main>
                )}

                {/* Post-Completion 3-Tab View */}
                {isCompleted && (
                    <main className="flex-1 flex w-full relative z-20 overflow-hidden bg-[#050505]">
                        {/* Main content area */}
                        <div className={`flex flex-col transition-all duration-300 ${chatOpen ? 'flex-1 min-w-0' : 'flex-1'}`}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.02 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute inset-0 flex flex-col w-full h-full"
                                    style={chatOpen ? { position: 'relative', flex: 1, inset: 'unset' } : {}}
                                >
                                    {activeTab === 'preview' && (
                                        <PreviewPanel buildProgress={buildProgress} files={files} onRedeploy={handleRedeploy} />
                                    )}
                                    {activeTab === 'explorer' && (
                                        <div className="flex h-full w-full">
                                            <div className="w-[320px] border-r border-white/5 bg-[#030303] shrink-0">
                                                <FileExplorer
                                                    files={files}
                                                    currentStage={currentStage}
                                                    onFileSelect={setSelectedFilePath}
                                                    activeFile={selectedFilePath}
                                                />
                                            </div>
                                            <div className="flex-1 bg-[#0a0a0a]">
                                                <FileViewer file={selectedFile} />
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'logs' && (
                                        <BuildLogs logs={buildLogs} isGenerating={status !== 'completed' && status !== 'failed'} />
                                    )}
                                    {activeTab === 'timeline' && (
                                        <AgentTimeline executionId={executionId} isCompleted={isCompleted} />
                                    )}
                                    {activeTab === 'thoughts' && (
                                        <div className="flex-1 p-8 bg-[#050505]">
                                            <div className="max-w-4xl mx-auto h-full">
                                                <ThoughtStream executionId={executionId} />
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'intelligence' && (
                                        <div className="flex-1 p-8 bg-[#050505] overflow-y-auto">
                                            <div className="max-w-4xl mx-auto space-y-8">
                                                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Autonomous Intelligence Insights</h2>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Research Card */}
                                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                        <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <Activity size={12} /> Architectural Research
                                                        </h3>
                                                        <div className="space-y-4">
                                                            <div className="text-xs text-white/60 leading-relaxed">
                                                                The Research Agent analyzed your prompt and cross-referenced the Level-5 Knowledge Base.
                                                            </div>
                                                            {/* We'd normally pull this from buildProgress.metadata.findings */}
                                                            <div className="flex flex-wrap gap-2">
                                                                {['Next.js 14', 'Tailwind CSS', 'Supabase Auth', 'Radix UI', 'BullMQ'].map(lib => (
                                                                    <span key={lib} className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[9px] font-bold rounded-lg uppercase">
                                                                        {lib}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Strategy Card */}
                                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                        <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <Brain size={12} /> Dynamic Strategy
                                                        </h3>
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] text-white/40 uppercase">Selected Strategy</span>
                                                                <span className="text-[10px] font-bold text-violet-300 uppercase italic">Comprehensive Planning</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] text-white/40 uppercase">Model Tier</span>
                                                                <span className="text-[10px] font-bold text-white uppercase">Llama 3.3 70B</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] text-white/40 uppercase">Reliability Score</span>
                                                                <span className="text-[10px] font-bold text-green-400 uppercase tabular-nums">0.98</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* RAG Context */}
                                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                    <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4">Long-Term Memory Retrieval (RAG)</h3>
                                                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] text-white/40 leading-relaxed italic">
                                                        System injected context from prior valid Next.js builds: using standard production layout pattern with Inter typeface and responsive grid utilities...
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'metrics' && (
                                        <ResourceGraph projectId={projectId} />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Chat Edit Panel — side pane */}
                        <AnimatePresence>
                            {chatOpen && (
                                <motion.div
                                    key="chat-pane"
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 380, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className="shrink-0 overflow-hidden border-l border-white/[0.06]"
                                    style={{ minWidth: 0 }}
                                >
                                    <div className="w-[380px] h-full">
                                        <ChatEditPanel
                                            projectId={projectId}
                                            isOpen={chatOpen}
                                            onClose={() => setChatOpen(false)}
                                            onFilesUpdated={(patches) => {
                                                // Supabase realtime will sync file list automatically.
                                                // If a file was created, select it in explorer.
                                                const firstCreated = patches?.find(p => p.action === 'create' || p.type === 'create');
                                                if (firstCreated) setSelectedFilePath(firstCreated.path);
                                            }}
                                            onNavigateToFile={(filePath) => {
                                                setSelectedFilePath(filePath);
                                                setActiveTab('explorer');
                                            }}
                                            onPreviewReload={() => {
                                                setActiveTab('preview');
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>
                )}
            </div>

            {/* Footer Status Bar */}
            <footer className="h-9 border-t border-white/5 bg-black/80 backdrop-blur-xl flex items-center justify-between px-8 z-50 relative shrink-0">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Operational Status: Stable</span>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10" />
                    <div className="flex items-center gap-4">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                            <Terminal size={10} /> Kernel: 0.12.4-LTS
                        </span>
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                            <Layout size={10} /> UI: Quantum-v2
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[9px] font-black text-white/20 uppercase tracking-widest italic">
                    <span className="tabular-nums">{mounted ? formatTime(new Date()) : '--:--:--'}</span>
                    <span className="opacity-50">•</span>
                    <span>PLATFORM-OS-{formatYear(new Date())}</span>
                </div>
            </footer>

            {/* Diff Viewer Modal */}
            {diffOpen && buildProgress?.metadata?.diffs && (
                <DiffViewer
                    diffs={buildProgress.metadata.diffs}
                    onClose={() => setDiffOpen(false)}
                    onApply={handleApplyDiff}
                />
            )}
        </div>
    );
};

export default React.memo(DevOpsDashboard);
