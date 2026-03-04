'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
    FileCode,
    ChevronRight,
    ArrowLeft,
    Loader2,
    Globe,
    Sparkles,
    Terminal,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { projectService } from '@/lib/project-service';
import { Project, ProjectFile } from '@/types/project';
import { toast } from 'sonner';
import { BuildUpdate } from '@/types/build';
import DevOpsDashboard from '@/components/DevOpsDashboard';
import { formatTime } from '@/lib/date';
import TechStackSelector, { TechStack } from '@/components/TechStackSelector';
import PushToGithubModal from '@/components/PushToGithubModal';

const FileItem = memo(({ file, isSelected, onClick }: { file: ProjectFile, isSelected: boolean, onClick: () => void }) => {
    const fileName = file.path.split('/').pop() || file.path;
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all mb-0.5 ${isSelected ? 'bg-primary/10 text-primary border border-primary/20 font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
        >
            <FileCode size={13} className={isSelected ? 'text-primary' : 'text-gray-500'} />
            <span className="truncate">{fileName}</span>
        </button>
    );
});
FileItem.displayName = 'FileItem';

export default function ProjectEditorPage({ params }: { params: { id: string } }) {
    const [project, setProject] = useState<Project | null>(null);
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasStartedGenerating, setHasStartedGenerating] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [buildProgress, setBuildProgress] = useState<BuildUpdate | null>(null);
    const [connectionMode, setConnectionMode] = useState<'live' | 'polling' | 'failover'>('live');
    const [isBackendOffline, setIsBackendOffline] = useState(false);
    const [stableHealthSeconds, setStableHealthSeconds] = useState(0);
    const [userRole, setUserRole] = useState<string>('user');
    const [error, setError] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");

    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const previewDoc = useMemo(() => {
        const htmlFile = files.find(f => f.path === 'index.html' || f.path === 'frontend/index.html' || f.path.endsWith('/index.html'));
        const html = htmlFile?.content || '';

        const css = files.filter(f => f.path.endsWith('.css')).map(f => `<style>${f.content}</style>`).join('\n');
        const js = files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.ts')).map(f => `<script>${f.content}</script>`).join('\n');

        if (!html && files.length > 0 && !isGenerating) return 'No HTML file found for preview. Please ensure index.html exists.';
        if (!html && isGenerating) return '';

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    ${css}
                </head>
                <body>
                    ${html}
                    ${js}
                </body>
            </html>
        `;
    }, [files, isGenerating]);

    const selectedFile = useMemo(() => {
        const activeFiles = (files.length > 0 ? files : (buildProgress as any)?.files || []) as ProjectFile[];
        return activeFiles.find((f: ProjectFile) => f.path === selectedFileId || f.id === selectedFileId);
    }, [files, selectedFileId, buildProgress]);

    const displayFiles = useMemo(() => {
        const bp = buildProgress as any;
        if (bp?.files && bp.files.length > 0) {
            return bp.files;
        }
        return files;
    }, [files, buildProgress]);

    const handleGenerate = useCallback(async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        setError(null);
        setHasStartedGenerating(true);
        toast.info("Initializing Secure Connection Grid...");

        const tempExecutionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0')).join('');

        let eventSource: EventSource | null = null;
        let retryCount = 0;
        const maxRetries = 2;

        const startStreaming = () => {
            return new Promise<void>((resolve, reject) => {
                if (eventSource) eventSource.close();
                eventSource = new EventSource(`/api/projects/${params.id}/build-progress?executionId=${tempExecutionId}`);

                eventSource.onopen = () => {
                    console.log("[SSE] Connected reliably. Triggering build API.");
                    resolve();
                };

                eventSource.onmessage = (event) => {
                    try {
                        const data: BuildUpdate = JSON.parse(event.data);
                        setBuildProgress(data);
                        retryCount = 0;
                        if (data.status === 'completed') {
                            eventSource?.close();
                            setTimeout(() => setIsGenerating(false), 1000);
                        } else if (data.status === 'failed') {
                            eventSource?.close();
                            setIsGenerating(false);
                        }
                    } catch (e) {
                        console.error("Failed to parse SSE data", e);
                    }
                };

                eventSource.onerror = () => {
                    if (eventSource?.readyState === EventSource.CLOSED) return;
                    if (retryCount < maxRetries) {
                        retryCount++;
                    } else if (connectionMode !== 'failover') {
                        eventSource?.close();
                        setConnectionMode('failover');
                        toast.warning("Live stream interrupted. Switching to Global Failover Mode (Polling).");
                        reject(new Error("SSE failed"));
                    }
                };
            });
        };

        try {
            await startStreaming();
            toast.success("Connection Secured. Initiating Orchestrator.", { icon: <Terminal size={16} /> });

            const res = await fetch('/api/generate-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: params.id,
                    executionId: tempExecutionId,
                    prompt: project?.description || "A modern web application"
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                const detailedError = errorData.error || res.statusText;
                toast.error(`Generation engine unavailable: ${detailedError}`);
                setError(detailedError);
                eventSource?.close();
                setIsGenerating(false);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            setError(errorMessage);
            toast.error(`Network error: ${errorMessage}`);
            eventSource?.close();
            setIsGenerating(false);
        }
    }, [params.id, isGenerating, project?.description, connectionMode, router]);

    const loadFiles = useCallback(async () => {
        const f = await projectService.getProjectFiles(params.id);
        const filesData = f || [];
        setFiles(filesData);
        if (filesData.length > 0 && !selectedFileId) {
            setSelectedFileId(filesData[0].id);
        }
    }, [params.id, selectedFileId]);

    const submitClarification = () => {
        if (!replyText.trim()) return;
        setHasStartedGenerating(true);
        toast.info("MultiAgent is building your world-class project...", {
            icon: <Sparkles className="text-primary animate-pulse" size={16} />
        });
        projectService.updateProject(params.id, { description: project?.description || '' });
    };

    const handleStartBuildExplicit = (stack: TechStack) => {
        setIsReviewing(false);
        const stackHeader = '[Architecture Requirements]';
        const stackContext = `\n\n${stackHeader}
Frontend: ${stack.frontend}
Styling: ${stack.styling}
Backend: ${stack.backend}
Database: ${stack.database}`;

        let currentDescription = project?.description || '';
        // If requirements already exist, we should replace them instead of appending
        if (currentDescription.includes(stackHeader)) {
            currentDescription = currentDescription.split(stackHeader)[0].trim();
        }

        const fullPrompt = currentDescription + stackContext;
        projectService.updateProject(params.id, { description: fullPrompt }).then(() => {
            setProject(prev => prev ? { ...prev, description: fullPrompt } : null);
            handleGenerate();
        });
    };

    const loadProjectData = useCallback(async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        try {
            const p = await projectService.getProject(params.id);
            if (!p) {
                if (isInitial) {
                    toast.error("Project not found");
                    router.push('/projects');
                }
                return;
            }
            setProject(p);
            const currentIsGenerating = p.status.startsWith('generating') || p.status === 'brainstorming';
            if (currentIsGenerating && p.last_execution_id) {
                setIsGenerating(true);
                if (!buildProgress || connectionMode === 'failover') {
                    fetch(`/api/build-state/${params.id}?executionId=${p.last_execution_id}`)
                        .then(res => res.json())
                        .then(data => { if (!data.error) setBuildProgress(data); });
                }
            } else if (p.status === 'completed') {
                setBuildProgress({ status: 'completed', currentStage: 'deployment', stages: [], totalProgress: 100 } as any);
            }
            loadFiles();
        } finally {
            if (isInitial) setIsLoading(false);
        }
    }, [params.id, loadFiles, router, buildProgress, connectionMode]);

    useEffect(() => {
        loadProjectData(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    useEffect(() => {
        if (!isGenerating && connectionMode === 'live') return;
        let delay = (connectionMode === 'polling' || connectionMode === 'failover') ? (isGenerating ? 3000 : 15000) : 10000;
        const interval = setInterval(() => loadProjectData(false), delay);
        return () => clearInterval(interval);
    }, [isGenerating, loadProjectData, connectionMode]);

    useEffect(() => {
        let isMounted = true;
        let reconnectTimeout: NodeJS.Timeout | null = null;
        let retryCount = 0;
        let isPollingCooldown = false;
        const supabase = projectService.getSupabase();

        const statusChannel = supabase.channel(`project-status-${params.id}`);
        const filesChannel = supabase.channel(`project-files-stream-${params.id}`);

        const connectRealtime = async () => {
            if (!isMounted || isPollingCooldown) return;

            statusChannel
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${params.id}` }, (payload) => {
                    const updatedProject = payload.new as Project;
                    setProject(updatedProject);
                    if (updatedProject.status === 'completed') setIsGenerating(false);
                    else if (updatedProject.status.startsWith('generating')) setIsGenerating(true);
                }).subscribe((status) => {
                    if (status === 'CHANNEL_ERROR') {
                        console.warn("[Realtime] Status channel error. Polling fallback engaged.");
                        setConnectionMode('polling');
                    }
                });

            filesChannel
                .on('postgres_changes', { event: '*', schema: 'public', table: 'project_files', filter: `project_id=eq.${params.id}` }, (payload) => {
                    const newOrUpdatedFile = payload.new as ProjectFile;
                    if (payload.eventType === 'DELETE') {
                        setFiles(prev => prev.filter(f => f.id !== payload.old.id));
                    } else {
                        setFiles(prev => {
                            const exists = prev.some(f => f.id === newOrUpdatedFile.id);
                            if (exists) return prev.map(f => f.id === newOrUpdatedFile.id ? newOrUpdatedFile : f);
                            return [...prev, newOrUpdatedFile].sort((a, b) => a.path.localeCompare(b.path));
                        });
                    }
                }).subscribe();
        };

        connectRealtime();
        return () => {
            isMounted = false;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            // Synchronous cleanup for permanent stability
            supabase.removeChannel(statusChannel);
            supabase.removeChannel(filesChannel);
        };
    }, [params.id]);

    useEffect(() => {
        if (!isGenerating) return;
        const checkHealth = async () => {
            try {
                const res = await fetch('/api/health');
                const data = await res.json();
                if (data.recommendation === 'offline') {
                    setIsBackendOffline(true);
                    setStableHealthSeconds(0);
                    setConnectionMode('failover');
                } else if (data.recommendation === 'polling') {
                    setIsBackendOffline(false);
                    setStableHealthSeconds(0);
                    if (connectionMode === 'live') {
                        setConnectionMode('failover');
                        toast.warning("Worker heartbeat stale. Switching to safe polling mode.");
                    }
                } else {
                    setIsBackendOffline(false);
                    if (connectionMode === 'failover') {
                        setStableHealthSeconds(prev => {
                            const next = prev + 10;
                            if (next >= 180) {
                                toast.success("System stability restored. Recovering live stream.");
                                setConnectionMode('live');
                                return 0;
                            }
                            return next;
                        });
                    }
                }
            } catch (err) {
                setIsBackendOffline(true);
                setStableHealthSeconds(0);
            }
        };
        const interval = setInterval(checkHealth, 10000);
        return () => clearInterval(interval);
    }, [isGenerating, connectionMode]);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background text-muted-foreground flex-col gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg font-medium animate-pulse">Initializing Environment...</p>
            </div>
        );
    }

    const isDevOpsMode = isGenerating || project?.status === 'completed' || project?.status === 'failed' || !!buildProgress;

    return (
        <div className="h-screen flex flex-col bg-[#050505] text-gray-300 overflow-hidden select-none font-sans">
            {!isDevOpsMode && (
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0d0d0d] relative z-50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/projects')} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-black text-white leading-tight uppercase tracking-tight">{project?.name}</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold italic">{project?.status}</span>
                                {isGenerating && <Loader2 size={10} className="animate-spin text-primary" />}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                            <Sparkles size={14} className={isGenerating ? 'animate-pulse' : ''} />
                            Start Build
                        </button>
                    </div>
                </header>
            )}

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 flex overflow-hidden relative bg-[#050505]">
                    <AnimatePresence mode="wait">
                        {((project?.status === 'draft' || !project?.status) && !hasStartedGenerating && !isGenerating && !error) && (
                            <motion.div key="draft-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex w-full">
                                <div className="w-1/2 border-r border-white/5 bg-[#080808] flex flex-col pt-12 px-10 relative">
                                    <div className="flex items-center gap-3 mb-10 group">
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                            <Terminal size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-none mb-1">AI Architect</div>
                                            <div className="text-xl font-black text-white tracking-widest uppercase italic leading-none">Configuration</div>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-8 pb-32 custom-scrollbar pr-4">
                                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 text-[13px] text-white/60 leading-relaxed shadow-2xl backdrop-blur-sm">
                                            {project?.description?.split('\n\nPreferences:')[0]}
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-primary/[0.03] rounded-[2rem] p-8 border border-primary/20 text-sm text-gray-300 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden active-border-glow">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                                            <div className="flex items-center gap-3 text-primary font-black text-[11px] uppercase tracking-[0.2em]">
                                                <Sparkles size={16} className="animate-pulse" />
                                                System Initialization Protocol
                                            </div>
                                            <div className="text-white font-bold text-base leading-tight">I&apos;m ready to architect your {project?.name}. Please specify your technical infrastructure preferences:</div>
                                            <div className="grid grid-cols-1 gap-4 text-white/40 font-medium italic">
                                                <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] rounded-2xl border border-white/5 group hover:border-primary/40 transition-all">
                                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-primary transition-colors">1</div>
                                                    <span>Framework preference (e.g. Next.js, Vite, React)</span>
                                                </div>
                                                <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] rounded-2xl border border-white/5 group hover:border-primary/40 transition-all">
                                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-primary transition-colors">2</div>
                                                    <span>UI & Styling System (e.g. Tailwind, Framer Motion)</span>
                                                </div>
                                                <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] rounded-2xl border border-white/5 group hover:border-primary/40 transition-all">
                                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-primary transition-colors">3</div>
                                                    <span>Backend requirements (e.g. DB, Auth, API)</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                    <div className="absolute bottom-8 left-10 right-10">
                                        <button
                                            onClick={() => setIsReviewing(true)}
                                            className="w-full bg-[#121212] border border-white/10 rounded-[1.5rem] p-4 flex items-center justify-between shadow-[0_30px_60px_rgba(0,0,0,0.8)] hover:border-primary/40 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 group-hover:text-primary transition-colors">
                                                    <Sparkles size={20} />
                                                </div>
                                                <div className="text-left py-2">
                                                    <div className="text-sm font-bold text-white mb-1">Select Architecture Stack</div>
                                                    <div className="text-xs text-white/40 font-medium">Click to configure frameworks & infrastructure</div>
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-lg">
                                                <ChevronRight size={24} />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                <div className={`w-1/2 bg-[#020202] py-12 px-6 relative overflow-hidden flex flex-col transition-all duration-500 ${isReviewing ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-8'}`}>
                                    <div className="relative z-10 w-full h-full">
                                        {isReviewing ? (
                                            <TechStackSelector
                                                prompt={project?.description || ''}
                                                onStartBuild={handleStartBuildExplicit}
                                                isGenerating={isGenerating}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center space-y-10 w-full max-w-sm mx-auto">
                                                <Globe size={64} className="text-white/10 mx-auto" />
                                                <div className="space-y-4">
                                                    <h2 className="text-2xl font-black text-white tracking-widest uppercase italic">Deterministic Grid</h2>
                                                    <p className="text-xs text-white/30 font-bold uppercase tracking-[0.3em] leading-relaxed">The high-speed generative engine is oscillating at idle. Inject parameters to initialize synchronization.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {isDevOpsMode && (
                            <motion.div key="devops-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex overflow-hidden w-full h-full">
                                <DevOpsDashboard
                                    buildProgress={buildProgress}
                                    files={displayFiles}
                                    projectId={params.id}
                                    onDownload={() => { window.location.href = `/api/projects/${params.id}/export`; }}
                                    onDeploy={() => { }}
                                    onPushToGithub={() => setIsGithubModalOpen(true)}
                                    onRedeploy={handleGenerate}
                                    projectTitle={project?.name || 'Tactical Project'}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {!isDevOpsMode && (
                <footer className="h-8 border-t border-white/5 bg-[#0a0a0a] px-6 flex items-center justify-between text-[9px] text-white/20 font-black uppercase tracking-[0.2em] z-50">
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${isBackendOffline ? 'bg-red-500' : 'bg-green-500'} shadow-[0_0_8px_rgba(34,197,94,0.4)]`} />
                            Grid Status: {isBackendOffline ? 'Isolated' : 'Synchronized'}
                        </span>
                        <div className="h-3 w-[1px] bg-white/5" />
                        <span>Core: {params.id.split('-')[0]}</span>
                    </div>
                </footer >
            )}

            <PushToGithubModal
                isOpen={isGithubModalOpen}
                onClose={() => setIsGithubModalOpen(false)}
                projectId={params.id}
                defaultRepoName={project?.name || 'multiagent-launch'}
            />
        </div>
    );
}
