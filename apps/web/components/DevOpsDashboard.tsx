"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Download, Github, Wand2, Share, ChevronDown } from 'lucide-react';
import { BuildUpdate } from '@libs/contracts';
import { toast } from 'sonner';
import FileExplorer from './FileExplorer';
import FileViewer from './FileViewer';
import BuildConsole from './BuildConsole';
import PreviewPanel from './PreviewPanel';
import ChatEditPanel from './ChatEditPanel';
import { DiffViewer, FileDiff } from './DiffViewer';
import ResourceGraph from './ResourceGraph';
import AgentTimeline from './AgentTimeline';
import { ThoughtStream } from './devops/ThoughtStream';
import { formatTime, formatYear } from '@libs/utils';

interface DevOpsDashboardProps {
    buildProgress: BuildUpdate | null;
    files: { path: string; content?: string }[];
    onDownload: () => void;
    onPushToGithub?: () => void;
    onDeploy?: () => void;
    onRedeploy?: () => void;
    projectTitle: string;
    projectId?: string;
}

const DevOpsDashboard: React.FC<DevOpsDashboardProps> = ({
    buildProgress,
    files,
    onDownload,
    onPushToGithub,
    onDeploy,
    onRedeploy,
    projectTitle,
    projectId = ''
}) => {
    const [activeTab, setActiveTab] = useState<'preview' | 'explorer' | 'logs' | 'metrics' | 'timeline' | 'thoughts' | 'intelligence'>('preview');
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [diffOpen, setDiffOpen] = useState(false);
    const [showLogs, setShowLogs] = useState(true);

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

    // Auto-expand preview on completion (Phase 10)
    useEffect(() => {
        if (isCompleted && showLogs) {
            setShowLogs(false);
            setActiveTab('preview');
        }
    }, [isCompleted, showLogs]);


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
        const res = await fetch(`/api/builds/${projectId}/apply-patch`, {
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
                <div className="flex items-center gap-6 relative min-w-0">
                    <div className="flex items-center gap-3 group cursor-pointer shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:scale-105 transition-all">
                            <Terminal size={14} className="text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[8px] font-black tracking-[0.2em] uppercase text-white/30 leading-none mb-0.5">Autonomous OS</span>
                            <h1 className="text-xs font-black text-white tracking-tight flex items-center gap-2 leading-none uppercase truncate">
                                {projectTitle}
                            </h1>
                        </div>
                    </div>

                    <div className="h-4 w-[1px] bg-white/10" />

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-2 py-1 rounded-md border ${
                            status === 'failed' ? 'bg-red-500/5 border-red-500/20' : 
                            status === 'completed' ? 'bg-green-500/5 border-green-500/20' :
                            'bg-primary/5 border-primary/20'
                        }`}>
                            <div className={`w-1 h-1 rounded-full ${
                                status === 'failed' ? 'bg-red-500' :
                                status === 'completed' ? 'bg-green-500' :
                                'bg-primary animate-pulse'
                            }`} />
                            <span className={`text-[8px] font-black uppercase tracking-widest ${
                                status === 'failed' ? 'text-red-500' :
                                status === 'completed' ? 'text-green-500' :
                                'text-primary'
                            }`}>
                                {status === 'completed' ? 'Production Ready' : currentStage}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions + Core Tabs */}
                <div className="flex items-center gap-3">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
                        <button onClick={onDownload} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Export Bundle">
                            <Download size={14} />
                        </button>
                        {onPushToGithub && (
                            <button onClick={onPushToGithub} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="GitHub">
                                <Github size={14} />
                            </button>
                        )}
                        <button onClick={() => {
                            const shareUrl = `${window.location.origin}/share/${projectId}`;
                            navigator.clipboard.writeText(shareUrl);
                            toast.success('Share link copied!');
                        }} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Share">
                            <Share size={14} />
                        </button>
                    </div>

                    {/* Tab Segment (Replit Style) */}
                    <div className="flex items-center bg-white/[0.03] p-1 rounded-lg border border-white/5">
                        <button onClick={() => setActiveTab('preview')} className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-primary text-white shadow-lg' : 'text-white/30 hover:text-white'}`}>Preview</button>
                        <button onClick={() => setActiveTab('explorer')} className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'explorer' ? 'bg-primary text-white shadow-lg' : 'text-white/30 hover:text-white'}`}>Code</button>
                    </div>

                    {/* AI Edit (Primary Action) */}
                    <button
                        onClick={() => setChatOpen(prev => !prev)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${chatOpen ? 'bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:brightness-110'}`}
                    >
                        <Wand2 size={12} />
                        <span>AI Edit</span>
                    </button>

                    <button
                        onClick={onDeploy}
                        className="px-4 py-2 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all ml-1 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                        Deploy
                    </button>

                    {/* More Menu */}
                    <div className="relative group">
                        <button className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                            <ChevronDown size={14} />
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl overflow-hidden hidden group-hover:block z-[100]">
                            {(['thoughts', 'timeline', 'intelligence', 'metrics'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`w-full text-left px-4 py-3 text-[9px] font-black tracking-widest uppercase hover:bg-white/5 transition-all border-b border-white/5 flex items-center gap-3 ${activeTab === tab ? 'text-primary bg-primary/5' : 'text-white/30'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Scanning Animation Layer */}
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                    <div className="w-full h-[1px] bg-primary/20 animate-scan blur-[1px] opacity-40" />
                </div>

                {/* Replit-Style Split View (Logs | Preview) */}
                <main className="flex-1 flex w-full relative z-20 overflow-hidden bg-[#050505]">
                    {/* Left Pane: Build Console / Logs (Phase 7) */}
                    <AnimatePresence initial={false}>
                        {showLogs && (
                            <motion.div 
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: '40%', opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="min-w-0 border-r border-white/5 relative overflow-hidden shrink-0"
                            >
                                <BuildConsole buildProgress={buildProgress} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Right Pane: Preview / Main Area */}
                    <div className="flex-1 min-w-0 flex flex-col relative bg-[#020202]">
                        {/* Sub-header for Tabs in the Right Pane */}
                        <div className="h-9 border-b border-white/5 bg-black/20 flex items-center justify-between px-4 shrink-0 z-30">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowLogs(prev => !prev)}
                                    className={`p-1.5 rounded-lg transition-all ${showLogs ? 'text-primary bg-primary/10' : 'text-white/30 hover:text-white'}`}
                                    title={showLogs ? "Hide Console" : "Show Console"}
                                >
                                    <Terminal size={12} />
                                </button>
                                <div className="w-[1px] h-3 bg-white/10 mx-1" />
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{activeTab}</span>
                            </div>
                        </div>


                        {/* Animated Content for Right Pane */}
                        <div className="flex-1 relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute inset-0 flex flex-col"
                                >
                                    {activeTab === 'preview' && (
                                        <PreviewPanel buildProgress={buildProgress} files={files} onRedeploy={handleRedeploy} />
                                    )}
                                    {activeTab === 'explorer' && (
                                        <div className="flex h-full w-full">
                                            <div className="w-[240px] border-r border-white/5 bg-[#030303] shrink-0">
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
                                    {activeTab === 'timeline' && (
                                        <AgentTimeline executionId={executionId} isCompleted={isCompleted} />
                                    )}
                                    {activeTab === 'thoughts' && (
                                        <div className="flex-1 p-6 bg-[#050505] overflow-y-auto">
                                            <ThoughtStream executionId={executionId} />
                                        </div>
                                    )}
                                    {activeTab === 'intelligence' && (
                                        <div className="flex-1 p-6 bg-[#050505] overflow-y-auto">
                                            <div className="max-w-2xl mx-auto space-y-6">
                                                <h3 className="text-sm font-black text-white uppercase tracking-tighter italic">Autonomous Insights</h3>
                                                {/* Summary views similar to previous but more compact */}
                                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                                                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Research findings</div>
                                                    <div className="text-xs text-white/40 italic">Aggregating library recommendations...</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'metrics' && (
                                        <ResourceGraph projectId={projectId} liveBuildProgress={buildProgress} />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* AI Chat Overlay / Side Pane */}
                    <AnimatePresence>
                        {chatOpen && (
                            <motion.div
                                key="chat-pane"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 340, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="shrink-0 overflow-hidden border-l border-white/[0.06] bg-[#080808]/95 backdrop-blur-xl z-50"
                            >
                                <div className="w-[340px] h-full">
                                    <ChatEditPanel
                                        projectId={projectId}
                                        isOpen={chatOpen}
                                        onClose={() => setChatOpen(false)}
                                        onFilesUpdated={(patches) => {
                                            const firstCreated = patches?.find(p => p.action === 'create' || p.type === 'create');
                                            if (firstCreated) setSelectedFilePath(firstCreated.path);
                                        }}
                                        onNavigateToFile={(filePath) => {
                                            setSelectedFilePath(filePath);
                                            setActiveTab('explorer');
                                        }}
                                        onPreviewReload={() => setActiveTab('preview')}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
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
                            UI: Quantum-v2
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
