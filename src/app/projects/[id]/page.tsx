'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FileCode,
    Save,
    RefreshCcw,
    ChevronRight,
    ChevronLeft,
    Monitor,
    Code,
    Layout,
    ArrowLeft,
    Loader2,
    Globe,
    Download,
    Sparkles,
    ExternalLink,
    Share2,
    ShieldCheck,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { projectService } from '@/lib/project-service';
import { Project, ProjectFile } from '@/types/project';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import JSZip from 'jszip';
import { memo } from 'react';
import { BuildUpdate } from '@/types/build';
import { BuildTimeline } from '@/components/BuildTimeline';
import { BuildSummary } from '@/components/BuildSummary';


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
    const [userReply, setUserReply] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [hasStartedGenerating, setHasStartedGenerating] = useState(false);
    const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split'>('split');
    const [editContent, setEditContent] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [previewSize, setPreviewSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [buildProgress, setBuildProgress] = useState<BuildUpdate | null>(null);
    const [showSummary, setShowSummary] = useState(false);
    const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
    const [connectionMode, setConnectionMode] = useState<'live' | 'polling' | 'failover'>('live');
    const [errorCount, setErrorCount] = useState(0);
    const [isBackendOffline, setIsBackendOffline] = useState(false);
    const [stableHealthSeconds, setStableHealthSeconds] = useState(0);
    const [userRole, setUserRole] = useState<string>('user');

    const previewWidths = {

        desktop: '100%',
        tablet: '768px',
        mobile: '375px'
    };

    const previewDoc = useMemo(() => {
        // Robust detection for full-stack index.html (root or frontend/ folder)
        const htmlFile = files.find(f => f.path === 'index.html' || f.path === 'frontend/index.html' || f.path.endsWith('/index.html'));
        const html = htmlFile?.content || '';

        const css = files.filter(f => f.path.endsWith('.css')).map(f => `<style>${f.content}</style>`).join('\n');
        const js = files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.ts')).map(f => `<script>${f.content}</script>`).join('\n');

        if (!html && files.length > 0 && !isGenerating) return 'No HTML file found for preview. Please ensure index.html exists.';
        if (!html && isGenerating) return ''; // Handled by build overlay

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <script src="https://cdn.tailwindcss.com"></script>
                    ${css}
                </head>
                <body>
                    ${html}
                    ${js}
                </body>
            </html>
        `;
    }, [files, isGenerating]);

    const router = useRouter();

    const selectedFile = useMemo(() =>
        files.find(f => f.id === selectedFileId),
        [files, selectedFileId]
    );

    const [error, setError] = useState<string | null>(null);

    const handleGenerate = useCallback(async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        setError(null);

        try {
            const res = await fetch('/api/generate-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: params.id,
                    prompt: project?.description || "A modern web application"
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                const detailedError = typeof errorData.error === 'object'
                    ? JSON.stringify(errorData.error)
                    : (errorData.error || res.statusText);

                setError(detailedError);
                toast.error(`Generation engine unavailable: ${detailedError}`);
            } else {
                const data = await res.json();
                setCurrentExecutionId(data.executionId);
                setShowSummary(false);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            setError(errorMessage);
            toast.error(`Network error: ${errorMessage}`);
        }
    }, [params.id, isGenerating, project?.description]);

    // SSE Effect for Real-time Progress
    useEffect(() => {
        if (!currentExecutionId || !isGenerating) return;

        let eventSource: EventSource | null = null;
        let retryCount = 0;
        const maxRetries = 2; // Aggressive failover for Distributed Resilience

        const connect = () => {
            if (eventSource) eventSource.close();

            eventSource = new EventSource(`/api/projects/${params.id}/build-progress?executionId=${currentExecutionId}`);

            eventSource.onmessage = (event) => {
                try {
                    const data: BuildUpdate = JSON.parse(event.data);
                    setBuildProgress(data);
                    retryCount = 0; // Reset on successful message

                    if (data.status === 'completed') {
                        eventSource?.close();
                        setTimeout(() => {
                            setShowSummary(true);
                            setIsGenerating(false);
                        }, 1000);
                    } else if (data.status === 'failed') {
                        eventSource?.close();
                        setIsGenerating(false);
                    }
                } catch (e) {
                    console.error("Failed to parse SSE data", e);
                }
            };

            eventSource.onerror = () => {
                eventSource?.close();
                setErrorCount(prev => prev + 1);

                if (retryCount < maxRetries) {
                    retryCount++;
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
                    setTimeout(connect, delay);
                } else if (connectionMode !== 'failover') {
                    setConnectionMode('failover');
                    toast.warning("Live stream interrupted. Switching to Global Failover Mode (Polling).");
                }
            };
        };

        if (connectionMode === 'live') {
            connect();
        }
        return () => eventSource?.close();
    }, [currentExecutionId, isGenerating, params.id, connectionMode]); // Re-connect if mode changes back to live


    const loadFiles = useCallback(async () => {
        const f = await projectService.getProjectFiles(params.id);
        const filesData = f || [];
        setFiles(filesData);

        setFiles(prev => {
            if (prev.length > 0 && !selectedFileId) {
                const firstId = prev[0].id;
                setSelectedFileId(firstId);
                setEditContent(prev[0].content || '');
            }
            return prev;
        });
    }, [params.id, selectedFileId]);

    const submitClarification = () => {
        if (!replyText.trim()) return;
        setUserReply(replyText);
        setHasStartedGenerating(true);
        toast.info("MultiAgent is building your world-class project...", {
            icon: <Sparkles className="text-primary animate-pulse" size={16} />
        });
        projectService.updateProject(params.id, { description: project?.description + '\n\nPreferences: ' + replyText }).then(() => {
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

            if (isInitial) {
                const supabase = projectService.getSupabase();
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', session.user.id).single();
                    if (profile) {
                        setUserRole(profile.role || 'user');
                    }
                }
            }

            // Sync generation state with project status
            const currentIsGenerating = p.status.startsWith('generating') || p.status === 'brainstorming';

            if (currentIsGenerating && p.last_execution_id) {
                setCurrentExecutionId(p.last_execution_id);
                setIsGenerating(true);

                // FALLBACK: Directly fetch build state if we are in generating mode and don't have progress yet or in failover
                if (!buildProgress || connectionMode === 'failover') {
                    fetch(`/api/projects/${params.id}/build-state?executionId=${p.last_execution_id}`)
                        .then(res => res.json())
                        .then(data => {
                            if (!data.error) setBuildProgress(data);
                        })
                        .catch(err => {
                            console.error("Manual sync failed:", err);
                            setErrorCount(prev => prev + 1);
                        });
                }
            }

            // Load files in parallel or sequence, but don't block initial UI
            loadFiles();

            if (p.status === 'draft' && p.description?.includes('Preferences:')) {
                handleGenerate();
            }
        } finally {
            if (isInitial) setIsLoading(false);
        }
    }, [params.id, loadFiles, handleGenerate, router, buildProgress]);

    const forceSync = useCallback(() => {
        toast.promise(loadProjectData(false), {
            loading: 'Syncing engineering core...',
            success: 'Synchronized.',
            error: 'Sync failed.'
        });
    }, [loadProjectData]);

    // Initial Mount Effect
    useEffect(() => {
        loadProjectData(true);
    }, [params.id, loadProjectData]);

    // Fallback / Polling Effect
    useEffect(() => {
        // If not generating and we have live websockets, no polling needed
        if (!isGenerating && connectionMode === 'live') return;

        // Determine polling speed
        let delay = 10000;
        if (connectionMode === 'polling' || connectionMode === 'failover') {
            delay = isGenerating ? 3000 : 15000;
        }

        const interval = setInterval(() => {
            loadProjectData(false);
        }, delay);

        return () => clearInterval(interval);
    }, [isGenerating, loadProjectData, connectionMode]);

    // Real-time Subscriptions Effect
    useEffect(() => {
        let isMounted = true;
        let reconnectTimeout: NodeJS.Timeout | null = null;
        let retryCount = 0;
        let isPollingCooldown = false;
        let statusChannel: ReturnType<ReturnType<typeof projectService.getSupabase>['channel']> | null = null;
        let filesChannel: ReturnType<ReturnType<typeof projectService.getSupabase>['channel']> | null = null;

        const supabase = projectService.getSupabase();

        const cleanUpChannels = async () => {
            if (statusChannel) {
                await supabase.removeChannel(statusChannel);
                statusChannel = null;
            }
            if (filesChannel) {
                await supabase.removeChannel(filesChannel);
                filesChannel = null;
            }
            // Dedup: clear any orphaned channels for this project to prevent multiple instances
            const allChannels = supabase.getChannels();
            const orphaned = allChannels.filter(c =>
                c.topic === `realtime:project-status-${params.id}` ||
                c.topic === `realtime:project-files-stream-${params.id}`
            );
            for (const c of orphaned) {
                await supabase.removeChannel(c);
            }
        };

        const connectRealtime = async () => {
            if (!isMounted || isPollingCooldown) return;

            await cleanUpChannels();

            statusChannel = supabase
                .channel(`project-status-${params.id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${params.id}` },
                    (payload) => {
                        const updatedProject = payload.new as Project;
                        setProject(updatedProject);

                        if (updatedProject.status === 'completed') {
                            setIsGenerating(false);
                        } else if (updatedProject.status.startsWith('generating')) {
                            setIsGenerating(true);
                        }
                    }
                );

            filesChannel = supabase
                .channel(`project-files-stream-${params.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'project_files', filter: `project_id=eq.${params.id}` },
                    (payload) => {
                        const newOrUpdatedFile = payload.new as ProjectFile;

                        if (payload.eventType === 'DELETE') {
                            setFiles(prev => prev.filter(f => f.id !== payload.old.id));
                            return;
                        }

                        setFiles(prev => {
                            const exists = prev.some(f => f.id === newOrUpdatedFile.id);
                            if (exists) {
                                return prev.map(f => f.id === newOrUpdatedFile.id ? newOrUpdatedFile : f);
                            }
                            return [...prev, newOrUpdatedFile].sort((a, b) => a.path.localeCompare(b.path));
                        });

                        if (payload.eventType === 'INSERT') {
                            toast.success(`Generated: ${newOrUpdatedFile.path}`, {
                                icon: '📄',
                                duration: 2000
                            });
                        }
                    }
                );

            let channelsSubscribed = 0;

            const handleSubscribe = (status: string) => {
                if (!isMounted) return;

                if (status === 'SUBSCRIBED') {
                    channelsSubscribed++;
                    if (channelsSubscribed === 2) {
                        retryCount = 0;
                        setConnectionMode('live');
                        // Successfully connected quietly (prevents console spam)
                    }
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    handleConnectionFailure(status);
                }
            };

            statusChannel.subscribe(handleSubscribe);
            filesChannel.subscribe(handleSubscribe);
        };

        const handleConnectionFailure = (status: string) => {
            if (!isMounted || isPollingCooldown) return;

            retryCount++;

            if (retryCount >= 5) {
                // Limit retries to 5 and switch to POLLING
                console.warn(`Realtime failed 5 times (${status}). Switching to POLLING mode for 3 minutes.`);
                setConnectionMode('polling');
                isPollingCooldown = true;
                cleanUpChannels();

                if (reconnectTimeout) clearTimeout(reconnectTimeout);
                reconnectTimeout = setTimeout(() => {
                    if (!isMounted) return;
                    console.log('Attempting to recover Realtime connection after 3m cooldown.');
                    isPollingCooldown = false;
                    retryCount = 0;
                    connectRealtime();
                }, 180000); // 3 minutes cooling down
            } else {
                // Exponential backoff strategy with jitter
                const backoffTiers = [2000, 5000, 10000, 30000];
                const baseDelay = backoffTiers[Math.min(retryCount - 1, backoffTiers.length - 1)] || 30000;
                const jitter = Math.floor(Math.random() * 1000);
                const reconnectDelay = baseDelay + jitter;

                if (retryCount === 1) {
                    console.warn(`Supabase realtime connection unstable. Retrying in ${Math.round(reconnectDelay / 1000)}s...`);
                }

                if (reconnectTimeout) clearTimeout(reconnectTimeout);
                reconnectTimeout = setTimeout(() => {
                    connectRealtime();
                }, reconnectDelay);
            }
        };

        connectRealtime();

        return () => {
            isMounted = false;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            cleanUpChannels();
        };
    }, [params.id]); // Excluded mutable states (like loadProjectData or errorCount) to prevent re-trigger loop

    // Backend Health Check Polling
    useEffect(() => {
        if (!isGenerating) return;

        const checkHealth = async () => {
            try {
                const res = await fetch('/api/health');
                const data = await res.json();

                if (data.recommendation === 'offline') {
                    setIsBackendOffline(true);
                    setStableHealthSeconds(0);
                    if (connectionMode !== 'failover') setConnectionMode('failover');
                } else if (data.recommendation === 'polling') {
                    setIsBackendOffline(false);
                    setStableHealthSeconds(0);
                    if (connectionMode === 'live') {
                        setConnectionMode('failover');
                        toast.warning("Worker heartbeat stale. Switching to safe polling mode.");
                    }
                } else {
                    setIsBackendOffline(false);
                    // System is healthy, track stability if in failover
                    if (connectionMode === 'failover') {
                        setStableHealthSeconds(prev => {
                            const next = prev + 10; // Polling interval is 10s
                            if (next >= 180) {
                                console.log('✅ System stable for 180s. Recovering to LIVE mode.');
                                toast.success("System stability restored. Recovering live stream.");
                                setConnectionMode('live');
                                setErrorCount(0);
                                return 0;
                            }
                            return next;
                        });
                    } else {
                        setStableHealthSeconds(0);
                    }
                }
            } catch (err) {
                console.error("Health check failed:", err);
                setIsBackendOffline(true);
                setStableHealthSeconds(0);
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 10000); // 10s health polling
        return () => clearInterval(interval);
    }, [isGenerating, connectionMode]); // Only depend on ID for subscriptions

    // Content Sync Effect: Keep editor in sync with selected file
    useEffect(() => {
        if (selectedFile) {
            setEditContent(selectedFile.content || '');
        }
    }, [selectedFileId, selectedFile]);

    const [showRefineChat, setShowRefineChat] = useState(false);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const [showAudit, setShowAudit] = useState(false);
    const [auditResults, setAuditResults] = useState<string | null>(null);

    const handleRefine = async () => {
        if (!selectedFileId || !refinementPrompt || isRefining) return;

        setIsRefining(true);
        const toastId = toast.loading(`Refining ${selectedFile?.path}...`);

        try {
            const res = await fetch('/api/refine-project-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId: selectedFileId,
                    projectId: params.id,
                    currentContent: editContent,
                    prompt: refinementPrompt,
                    filePath: selectedFile?.path
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Refinement failed');
            }

            const { updatedFile } = await res.json();

            // Update local state
            setFiles(prev => prev.map(f => f.id === selectedFileId ? updatedFile : f));
            setEditContent(updatedFile.content);

            toast.success("File refined successfully!", { id: toastId });
            setShowRefineChat(false);
            setRefinementPrompt('');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Refinement failed";
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        } finally {
            setIsRefining(false);
        }
    };

    const handleAudit = async () => {
        if (!selectedFileId || isRefining) return;

        setIsRefining(true);
        setShowAudit(true);
        setAuditResults(null);

        const toastId = toast.loading("Analyzing for professional standards...");

        try {
            const res = await fetch('/api/refine-project-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId: selectedFileId,
                    projectId: params.id,
                    currentContent: editContent,
                    prompt: "Perform a World-Class SEO and Accessibility audit. List missing meta tags, accessibility issues, and professional design suggestions. Be concise. DO NOT modify the file, just provide the feedback.",
                    filePath: selectedFile?.path
                })
            });

            if (!res.ok) throw new Error("Audit failed");

            const { updatedFile } = await res.json();
            setAuditResults(updatedFile.content);
            toast.success("Audit complete!", { id: toastId });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Audit failed";
            toast.error(`Audit failed: ${errorMessage}`, { id: toastId });
            setShowAudit(false);
        } finally {
            setIsRefining(false);
        }
    };

    const handleSaveFile = async () => {
        if (!selectedFileId || !editContent) return;

        const updated = await projectService.updateFile(selectedFileId, editContent);
        if (updated) {
            setFiles(prev => prev.map(f => f.id === selectedFileId ? updated : f));
            toast.success("File saved");
        }
    };

    const handleDeploy = async () => {
        const toastId = toast.loading("Deploying to MultiAgent Cloud...");
        try {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            const publicUrl = `${window.location.origin}/shared/${params.id}`;

            // Update project in DB
            const { error } = await projectService.updateProject(params.id, {
                deployment_url: publicUrl,
                status: 'completed'
            });

            if (error) throw error;

            setProject(prev => prev ? { ...prev, deployment_url: publicUrl } : null);
            toast.success("Project deployed live!", {
                id: toastId,
                description: "Your site is now accessible via the share link."
            });
        } catch {
            toast.error("Deployment failed", { id: toastId });
        }
    };

    const handleCopyLink = () => {
        if (!project?.deployment_url) return;
        navigator.clipboard.writeText(project.deployment_url);
        toast.success("Share link copied to clipboard!");
    };

    const handleDownload = async () => {
        const toastId = toast.loading("Preparing your project files...");
        try {
            const zip = new JSZip();

            // Add all files to the zip
            files.forEach(file => {
                zip.file(file.path, file.content || '');
            });

            // Generate zip file
            const blob = await zip.generateAsync({ type: "blob" });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project?.name || 'multiagent-project'}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Project downloaded!", { id: toastId });
        } catch {
            toast.error("Failed to package project", { id: toastId });
        }
    };


    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background text-muted-foreground flex-col gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg font-medium animate-pulse">Initializing Environment...</p>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#0d0d0d] text-gray-300 overflow-hidden select-none font-sans">
            {/* Toolbar */}
            <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#1a1a1a]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/projects')}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-semibold text-white leading-tight">{project?.name}</h1>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest">{project?.status}</span>
                            {isGenerating && <Loader2 size={10} className="animate-spin text-primary" />}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                    <button onClick={() => setViewMode('editor')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'editor' ? 'bg-primary text-primary-foreground' : 'hover:bg-white/5'}`}><Code size={16} /></button>
                    <button onClick={() => setViewMode('split')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'split' ? 'bg-primary text-primary-foreground' : 'hover:bg-white/5'}`}><Layout size={16} /></button>
                    <button onClick={() => setViewMode('preview')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'preview' ? 'bg-primary text-primary-foreground' : 'hover:bg-white/5'}`}><Monitor size={16} /></button>
                </div>

                <div className="flex items-center gap-3">
                    {project?.deployment_url && (
                        <div className="flex items-center gap-1 pr-2 border-r border-white/5">
                            <button
                                onClick={() => window.open(project.deployment_url, '_blank')}
                                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-primary flex items-center gap-1.5 text-[10px] font-bold"
                                title="Open Live Site"
                            >
                                <ExternalLink size={14} />
                                LIVE
                            </button>
                            <button
                                onClick={handleCopyLink}
                                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-primary"
                                title="Copy Share Link"
                            >
                                <Share2 size={14} />
                            </button>
                        </div>
                    )}
                    <button
                        onClick={handleAudit}
                        disabled={isRefining}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${showAudit ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                        title="Run Professional Audit"
                    >
                        <ShieldCheck size={14} className={isRefining && showAudit ? 'animate-pulse' : ''} />
                        Audit
                    </button>
                    <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-lg transition-all">
                        <Download size={14} />
                        Download
                    </button>
                    <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-lg transition-all">
                        <RefreshCcw size={14} className={isGenerating ? 'animate-spin' : ''} />
                        Rebuild
                    </button>
                    <button
                        onClick={handleDeploy}
                        className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Globe size={14} />
                        {project?.deployment_url ? 'Redeploy' : 'Deploy'}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 flex overflow-hidden relative bg-[#0a0a0a]">
                    <AnimatePresence mode="wait">
                        {/* 1. DRAFT MODE (Initial Configuration) */}
                        {(project?.status === 'draft' && !hasStartedGenerating && !isGenerating && !error) && (
                            <motion.div
                                key="draft-view"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex w-full"
                            >
                                {/* Left Panel: Chat Phase */}
                                <div className="w-1/2 border-r border-white/5 bg-[#0d0d0d] flex flex-col pt-10 px-8 relative">
                                    <div className="flex items-center gap-2 mb-8 text-primary font-bold text-lg"><Globe size={20} /> MultiAgent</div>
                                    <div className="flex-1 overflow-y-auto space-y-6 pb-24 custom-scrollbar pr-4">
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-sm text-gray-300 shadow-xl">
                                            {project?.description?.split('\n\nPreferences:')[0]}
                                        </motion.div>

                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-primary/5 rounded-2xl p-6 border border-primary/20 text-sm text-gray-300 space-y-5 shadow-lg relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                                <Sparkles size={14} className="animate-pulse" />
                                                Agent is asking 5 key questions
                                            </div>
                                            <div className="text-gray-200 font-medium">To build your world-class product, I need to clarify these essential details:</div>
                                            <div className="space-y-3 pl-2 text-gray-400">
                                                <p><strong className="text-gray-200">1. Framework</strong> - e.g., Next.js or React?</p>
                                                <p><strong className="text-gray-200">2. Backend</strong> - e.g., Supabase or Custom?</p>
                                                <p><strong className="text-gray-200">3. UI Styling</strong> - Tailwind or Sleek Dark Mode?</p>
                                                <p><strong className="text-gray-200">4. Auth</strong> - Social Login or Email?</p>
                                                <p><strong className="text-gray-200">5. Features</strong> - Top 3 must-have features?</p>
                                            </div>
                                        </motion.div>
                                    </div>
                                    <div className="absolute bottom-6 w-[calc(100%-4rem)]">
                                        <div className="bg-[#141414] border border-white/10 rounded-2xl p-2 flex items-center shadow-2xl focus-within:border-primary/50 transition-colors">
                                            <textarea
                                                placeholder="Message Agent (e.g., 1a, 2a, 3a)..."
                                                className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-200 p-3 min-h-[44px] max-h-32"
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitClarification(); } }}
                                            />
                                            <button onClick={submitClarification} disabled={!replyText.trim() || isGenerating} className="p-3 bg-primary rounded-xl text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all">
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Right Panel: Dashboard Placeholder */}
                                <div className="w-1/2 bg-[#050505] flex items-center justify-center p-12 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
                                    <div className="text-center space-y-8 w-full max-w-md">
                                        <Sparkles size={32} className="text-gray-500 mx-auto" />
                                        <div className="space-y-2">
                                            <h2 className="text-2xl font-bold text-white tracking-tight">Deterministic Engineering</h2>
                                            <p className="text-sm text-gray-400 font-medium">Configure your requirements to begin the high-speed build process.</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* 2. DETERMINISTIC BUILD MODE */}
                        {isGenerating && (
                            <motion.div
                                key="build-view"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-[60] bg-[#0a0a0a] flex flex-col items-center justify-center p-4 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] -z-10" />
                                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] -z-10" />
                                <div className="w-full max-w-2xl space-y-6">
                                    <div className="text-center space-y-2">
                                        <div className="inline-flex p-3 bg-primary/10 rounded-2xl border border-primary/20 mb-1">
                                            <Loader2 size={24} className="text-primary animate-spin" />
                                        </div>
                                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-tight">
                                            🚀 Building Your Application
                                        </h1>
                                        <p className="text-gray-400 text-sm max-w-lg mx-auto font-medium">
                                            MultiAgent is architecting and generating your system.
                                        </p>
                                    </div>
                                    <div className="bg-[#111] border border-white/5 rounded-[2rem] p-4 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                                        <BuildTimeline data={buildProgress} onSync={forceSync} />
                                    </div>
                                    <div className="flex justify-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                                        <span>Engineering Mode Active</span>
                                        <span className="text-primary animate-pulse">•</span>
                                        {userRole === 'owner' ? (
                                            <span className="text-red-500 animate-pulse">OWNER MODE ACTIVE – GOVERNANCE DISABLED</span>
                                        ) : (
                                            <span>User Input Locked</span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* 3. SUCCESS SUMMARY MODE */}
                        {showSummary && buildProgress && !isGenerating && (
                            <motion.div
                                key="summary-view"
                                initial={{ opacity: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-[70] bg-[#0a0a0a] flex items-center justify-center p-4 overflow-hidden"
                            >
                                <BuildSummary data={buildProgress} onViewProject={() => setShowSummary(false)} />
                            </motion.div>
                        )}

                        {/* 4. ERROR / FAILURE MODE */}
                        {error && !isGenerating && (
                            <motion.div
                                key="error-view"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute inset-0 z-[60] bg-[#0a0a0a] flex items-center justify-center p-8"
                            >
                                <div className="w-full max-w-lg bg-[#111] border border-red-500/20 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl">
                                    <div className="inline-flex p-4 bg-red-500/10 rounded-3xl border border-red-500/20">
                                        <XCircle size={32} className="text-red-500" />
                                    </div>
                                    <div className="space-y-4">
                                        <h1 className="text-3xl font-black text-white tracking-tight">Build Interrupted</h1>
                                        <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-sm text-red-400/80 font-mono text-left max-h-32 overflow-y-auto custom-scrollbar">
                                            {error}
                                        </div>
                                        <p className="text-gray-500 text-sm">An unexpected error occurred during the build. Your configuration has been preserved.</p>
                                    </div>
                                    <button
                                        onClick={handleGenerate}
                                        className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition-all shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                                    >
                                        <RefreshCcw size={18} /> RETRY DETERMINISTIC BUILD
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* 5. EDITOR / PREVIEW MODE (Post-Generation) */}
                        {(!isGenerating && !showSummary && !error && hasStartedGenerating) && (
                            <motion.div key="editor-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex overflow-hidden">
                                {/* Left Side: Sidebar Toggle + Content */}
                                <div className="flex-1 flex flex-col relative">
                                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-[#1a1a1a] border border-white/10 p-1 rounded-r-lg hover:bg-primary/20 hover:text-primary transition-all shadow-xl">
                                        {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                                    </button>

                                    <div className="flex-1 flex overflow-hidden">
                                        {(viewMode === 'editor' || viewMode === 'split') && (
                                            <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden border-r border-white/5">
                                                <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#1c1c1c]">
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        {selectedFile?.path || 'No file selected'}
                                                    </span>
                                                    <button onClick={handleSaveFile} className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-white transition-colors">
                                                        <Save size={12} /> SAVE
                                                    </button>
                                                </div>
                                                <div className="flex-1 relative overflow-auto custom-scrollbar">
                                                    <textarea
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        className="absolute inset-0 w-full h-full bg-transparent text-gray-300 p-6 font-mono text-sm leading-relaxed outline-none resize-none z-10 opacity-30 focus:opacity-100 transition-opacity"
                                                        spellCheck={false}
                                                    />
                                                    {editContent ? (
                                                        <SyntaxHighlighter
                                                            language={selectedFile?.language || 'typescript'}
                                                            style={vscDarkPlus}
                                                            customStyle={{ margin: 0, padding: '24px', backgroundColor: 'transparent', fontSize: '14px', lineHeight: '1.6', fontFamily: 'JetBrains Mono, Menlo, monospace', pointerEvents: 'none' }}
                                                        >
                                                            {editContent}
                                                        </SyntaxHighlighter>
                                                    ) : (
                                                        <div className="flex-1 flex items-center justify-center h-full">
                                                            <p className="text-xs text-gray-600">Select a file to view code</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(viewMode === 'preview' || viewMode === 'split') && (
                                            <div className="flex-1 flex flex-col bg-[#f5f5f5] overflow-hidden">
                                                <div className="h-10 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50 z-10">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><div className="w-2.5 h-2.5 rounded-full bg-green-400" /></div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase ml-4">localhost:3000</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-gray-200/50 p-0.5 rounded-lg border border-gray-300/50">
                                                        {['mobile', 'tablet', 'desktop'].map((s) => (
                                                            <button
                                                                key={s}
                                                                onClick={() => setPreviewSize(s as any)}
                                                                className={`p-1 rounded-md transition-all ${previewSize === s ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
                                                            >
                                                                {s === 'mobile' ? <Monitor size={12} className="-rotate-90 scale-75" /> : s === 'tablet' ? <Layout size={12} /> : <Monitor size={12} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button onClick={() => { }} className="text-gray-400 hover:text-gray-600"><RefreshCcw size={12} /></button>
                                                </div>
                                                <div className="flex-1 overflow-auto flex justify-center p-8 bg-[#f0f0f0] custom-scrollbar">
                                                    <motion.div
                                                        animate={{ width: previewWidths[previewSize] }}
                                                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                                                        className="h-full bg-white shadow-2xl border border-gray-200 rounded-lg overflow-hidden relative"
                                                    >
                                                        <iframe srcDoc={previewDoc} className="w-full h-full border-none" title="Preview" sandbox="allow-scripts" key={files.length} />
                                                    </motion.div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Refinement Overlay Buttons */}
                                    <div className="absolute right-6 bottom-6 z-20 flex flex-col items-end gap-3">
                                        <button
                                            onClick={() => setShowRefineChat(!showRefineChat)}
                                            className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-xl hover:scale-105 transition-all border border-primary/20 flex items-center gap-2 group"
                                        >
                                            <Sparkles size={18} />
                                            <span className="text-xs font-bold px-1">Ask Agent</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            <footer className="h-6 border-t border-white/5 bg-[#141414] px-4 flex items-center justify-between text-[10px] text-gray-500 font-medium z-[100]">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isGenerating ? (isBackendOffline ? 'bg-red-500 animate-pulse' : (connectionMode === 'failover' ? 'bg-orange-500 animate-pulse' : 'bg-primary animate-pulse')) : 'bg-green-500'}`} />
                        {isGenerating
                            ? (isBackendOffline ? 'OFFLINE (No Backend)' : (connectionMode === 'failover' ? 'Failover Mode (Polling)' : 'Engineering Mode Active'))
                            : 'System Ready'}
                    </span>
                    <span className="text-white/20">|</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${isBackendOffline ? 'bg-red-500/10 text-red-500 border border-red-500/20' : (connectionMode === 'failover' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-green-500/10 text-green-500')}`}>
                        {(isBackendOffline ? 'OFFLINE' : connectionMode).toUpperCase()}
                    </span>
                    <span className="text-white/20">|</span>
                    <span>{project?.id.split('-')[0]}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-primary/60 font-bold tracking-widest">MULTIAGENT CORE v2.0-DETERMINISTIC</span>
                    <span className="text-white/20">|</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date().toLocaleTimeString()}</span>
                </div>
            </footer>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}</style>
        </div>
    );
}

const XCircle = ({ size, className }: { size: number, className: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);
