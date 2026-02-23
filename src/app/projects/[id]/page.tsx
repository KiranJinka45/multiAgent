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
    ShieldCheck
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

const FileItem = memo(({ file, isSelected, onClick }: { file: ProjectFile, isSelected: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 ${isSelected ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
    >
        <FileCode size={14} className={isSelected ? 'text-primary' : 'text-gray-600'} />
        <span className="truncate">{file.path}</span>
    </button>
));
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

    const previewWidths = {
        desktop: '100%',
        tablet: '768px',
        mobile: '375px'
    };

    const previewDoc = useMemo(() => {
        const html = files.find(f => f.path.endsWith('.html'))?.content || '';
        const css = files.filter(f => f.path.endsWith('.css')).map(f => `<style>${f.content}</style>`).join('\n');
        const js = files.filter(f => f.path.endsWith('.js')).map(f => `<script>${f.content}</script>`).join('\n');

        if (!html && files.length > 0) return 'No HTML file found for preview.';

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
    }, [files]);

    const router = useRouter();

    const selectedFile = useMemo(() =>
        files.find(f => f.id === selectedFileId),
        [files, selectedFileId]
    );

    const handleGenerate = useCallback(async () => {
        if (isGenerating) return;
        setIsGenerating(true);

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
                toast.error(`Generation failed: ${detailedError}`);
                setIsGenerating(false);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            toast.error(`An error occurred: ${errorMessage}`);
            setIsGenerating(false);
        }
    }, [params.id, isGenerating, project?.description]);

    const loadFiles = useCallback(async () => {
        const f = await projectService.getProjectFiles(params.id);
        const filesData = f || [];
        setFiles(filesData);

        if (filesData.length > 0 && !selectedFileId) {
            setSelectedFileId(filesData[0].id);
            setEditContent(filesData[0].content || '');
        }
    }, [params.id, selectedFileId]);

    const submitClarification = () => {
        if (!replyText.trim()) return;
        setUserReply(replyText);
        setHasStartedGenerating(true);
        projectService.updateProject(params.id, { description: project?.description + '\n\nPreferences: ' + replyText }).then(() => {
            handleGenerate();
        });
    };

    const loadProjectData = useCallback(async () => {
        setIsLoading(true);
        try {
            const p = await projectService.getProject(params.id);
            if (!p) {
                toast.error("Project not found");
                router.push('/projects');
                return;
            }
            setProject(p);

            // Sync generation state with project status
            const currentIsGenerating = p.status.startsWith('generating') || p.status === 'brainstorming';
            setIsGenerating(currentIsGenerating);

            await loadFiles();

            if (p.status === 'draft') {
                // handleGenerate(); // Disabled for clarification phase
            }
        } finally {
            setIsLoading(false);
        }
    }, [params.id, router, loadFiles, handleGenerate]);

    useEffect(() => {
        loadProjectData();

        // Listen for real-time status updates
        const supabase = projectService.getSupabase();

        // Channel for project status
        const statusChannel = supabase
            .channel('project-status')
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
            )
            .subscribe();

        // Channel for real-time file streaming
        const filesChannel = supabase
            .channel('project-files-stream')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'project_files', filter: `project_id=eq.${params.id}` },
                (payload) => {
                    const newOrUpdatedFile = payload.new as ProjectFile;

                    setFiles(prev => {
                        const exists = prev.some(f => f.id === newOrUpdatedFile.id);
                        let updated;

                        if (exists) {
                            // Update existing file in the tree
                            updated = prev.map(f => f.id === newOrUpdatedFile.id ? newOrUpdatedFile : f);
                        } else {
                            // Add new file
                            updated = [...prev, newOrUpdatedFile].sort((a, b) => a.path.localeCompare(b.path));

                            // Auto-select if it's the first file and nothing is selected
                            if (updated.length === 1) {
                                setSelectedFileId(newOrUpdatedFile.id);
                                setEditContent(newOrUpdatedFile.content || '');
                            }
                        }

                        // If the currently selected file was updated, update the editor content
                        if (selectedFileId === newOrUpdatedFile.id) {
                            setEditContent(newOrUpdatedFile.content || '');
                        }

                        return updated;
                    });

                    if (payload.eventType === 'INSERT') {
                        toast.success(`Generated: ${newOrUpdatedFile.path}`, {
                            icon: '📄',
                            duration: 2000
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(statusChannel);
            supabase.removeChannel(filesChannel);
        };
    }, [params.id, loadProjectData, selectedFileId]);

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
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="border-r border-white/5 bg-[#141414] flex flex-col">
                            <div className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">Explorer<FileCode size={12} /></div>
                            <div className="flex-1 overflow-y-auto px-2">
                                {files.map(file => (
                                    <FileItem
                                        key={file.id}
                                        file={file}
                                        isSelected={selectedFileId === file.id}
                                        onClick={() => { setSelectedFileId(file.id); setEditContent(file.content || ''); }}
                                    />
                                ))}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                <main className="flex-1 flex overflow-hidden relative bg-[#0a0a0a]">
                    {(files.length === 0 && (!hasStartedGenerating || project?.status === 'draft' || project?.status.startsWith('generating') || project?.status === 'brainstorming')) ? (
                        <div className="flex-1 flex w-full">
                            {/* Left Panel: Chat Phase */}
                            <div className="w-1/2 border-r border-white/5 bg-[#0d0d0d] flex flex-col pt-10 px-8 relative">
                                <div className="flex items-center gap-2 mb-8 text-primary font-bold text-lg"><Globe size={20} /> MultiAgent</div>
                                <div className="flex-1 overflow-y-auto space-y-6 pb-24 custom-scrollbar pr-4">
                                    {/* User Original Prompt */}
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-sm text-gray-300 shadow-xl">
                                        {project?.description?.split('\n\nPreferences:')[0]}
                                    </motion.div>
                                    
                                    {/* AI Clarification Questions */}
                                    {project?.status === 'draft' && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-primary/5 rounded-2xl p-6 border border-primary/20 text-sm text-gray-300 space-y-5 shadow-lg relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                                <Sparkles size={14} className="animate-pulse" />
                                                Agent is asking a question
                                            </div>
                                            <div className="text-gray-200 font-medium">
                                                Before I start building, I need to clarify a few key aspects of your platform:
                                            </div>
                                            <div className="space-y-3 pl-2 text-gray-400">
                                                <p><strong className="text-gray-200">1. Frontend Framework</strong> - a. React (Next.js) b. Vue c. Vanilla JS</p>
                                                <p><strong className="text-gray-200">2. Backend & Database</strong> - a. Supabase (PostgreSQL) b. Firebase c. Node/Mongo</p>
                                                <p><strong className="text-gray-200">3. Styling Preference</strong> - a. Tailwind CSS b. Custom CSS c. Material UI</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* User Reply */}
                                    {userReply && (
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-sm text-gray-300 shadow-xl self-end mt-6 ml-auto max-w-[80%] border-primary/30 text-right">
                                            {userReply}
                                        </motion.div>
                                    )}

                                    {/* Generating State */}
                                    {isGenerating && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/5 rounded-2xl p-6 border border-primary/20 text-sm text-gray-300 shadow-lg relative overflow-hidden mt-6 flex flex-col gap-4">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                            <div className="flex items-center gap-3">
                                                <Loader2 size={16} className="text-primary animate-spin" />
                                                <span className="text-primary font-bold text-xs uppercase tracking-widest">Building Infrastructure</span>
                                            </div>
                                            <p className="text-gray-400">I'll set up your core structure now and we'll iterate from there. Let's build.</p>
                                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                                <motion.div 
                                                    className="h-full bg-primary" 
                                                    initial={{ width: "10%" }} 
                                                    animate={{ width: "100%" }} 
                                                    transition={{ duration: 15, ease: "linear" }}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                                
                                {/* Input Box */}
                                {!userReply && project?.status === 'draft' && (
                                    <div className="absolute bottom-6 flex-1 w-[calc(100%-4rem)]">
                                        <div className="bg-[#141414] border border-white/10 rounded-2xl p-2 flex items-center shadow-2xl focus-within:border-primary/50 transition-colors">
                                            <textarea 
                                                placeholder="Message Agent (e.g., 1a, 2a, 3a)..." 
                                                className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-200 p-3 min-h-[44px] max-h-32"
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        submitClarification();
                                                    }
                                                }}
                                            />
                                            <button onClick={submitClarification} disabled={!replyText.trim() || isGenerating} className="p-3 bg-primary rounded-xl text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Panel: Placeholder Preview */}
                            <div className="w-1/2 bg-[#050505] flex items-center justify-center p-12 relative overflow-hidden">
                                {/* Grid background */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
                                
                                <div className="relative z-10 text-center space-y-8 w-full max-w-md">
                                    <Sparkles size={32} className="text-gray-500 mx-auto" />
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg">Deploy Your Application</h2>
                                        <p className="text-sm text-gray-400">Make your app publicly available with managed infrastructure.</p>
                                    </div>
                                    
                                    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden transform hover:scale-[1.02] transition-transform">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                                                <Globe size={14} className="text-gray-500" /> Deployments
                                            </div>
                                        </div>
                                        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 bg-green-500/80 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                                <div className="text-sm text-gray-300 font-medium tracking-tight">Live <span className="text-gray-500 font-mono ml-2 text-xs">multiagent.app</span></div>
                                            </div>
                                            <button className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">Visit ↗</button>
                                        </div>
                                    </div>
                                    
                                    {isGenerating && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mt-12 gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce delay-100" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce delay-200" />
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-[#1a1a1a] border border-white/10 p-1 rounded-r-lg hover:bg-primary/20 hover:text-primary transition-all shadow-xl">
                                {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                            </button>
                            
                            {/* Re-generating sleek banner */}
                            <AnimatePresence>
                                {isGenerating && files.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a]/90 backdrop-blur-md px-4 py-2 rounded-full border border-primary/30 shadow-2xl flex items-center gap-3">
                                        <Loader2 size={14} className="text-primary animate-spin" />
                                        <span className="text-xs font-bold text-gray-200 uppercase tracking-widest">Rebuilding Core Engine...</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex-1 flex overflow-hidden">
                                {(viewMode === 'editor' || viewMode === 'split') && (
                            <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
                                <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#1c1c1c]">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        {selectedFile?.path || 'No file selected'}
                                    </span>
                                    <button onClick={handleSaveFile} className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-white transition-colors">
                                        <Save size={12} /> SAVE
                                    </button>
                                </div>
                                <div className="flex-1 relative overflow-auto custom-scrollbar group">
                                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="absolute inset-0 w-full h-full bg-transparent text-gray-300 p-6 font-mono text-sm leading-relaxed outline-none resize-none z-10 opacity-30 focus:opacity-100 transition-opacity" spellCheck={false} />
                                    <SyntaxHighlighter language={selectedFile?.language || 'typescript'} style={vscDarkPlus} customStyle={{ margin: 0, padding: '24px', backgroundColor: 'transparent', fontSize: '14px', lineHeight: '1.6', fontFamily: 'JetBrains Mono, Menlo, monospace', pointerEvents: 'none' }}>
                                        {editContent}
                                    </SyntaxHighlighter>

                                    {/* AI Refinement Overlay */}
                                    <div className="absolute right-6 bottom-6 z-20 flex flex-col items-end gap-3 text-white">
                                        <AnimatePresence>
                                            {showRefineChat && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="w-80 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 space-y-3"
                                                >
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                                                        <Sparkles size={10} />
                                                        Refine with AI
                                                    </div>
                                                    <textarea
                                                        autoFocus
                                                        value={refinementPrompt}
                                                        onChange={(e) => setRefinementPrompt(e.target.value)}
                                                        placeholder="Example: Add a responsive navbar with a logo..."
                                                        className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-neutral-200 outline-none focus:border-primary/50 transition-all min-h-[80px] resize-none"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleRefine();
                                                            }
                                                            if (e.key === 'Escape') setShowRefineChat(false);
                                                        }}
                                                    />
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] text-neutral-500">Press Enter to Apply</span>
                                                        <button
                                                            onClick={handleRefine}
                                                            disabled={isRefining || !refinementPrompt}
                                                            className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            {isRefining ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                                            Apply Changes
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* AI Audit Results Overlay */}
                                        <AnimatePresence>
                                            {showAudit && auditResults && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                    className="absolute left-6 bottom-6 z-20 w-96 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                                                >
                                                    <div className="bg-primary/20 px-4 py-3 flex items-center justify-between border-b border-white/5">
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                                                            <ShieldCheck size={12} />
                                                            Professional Audit
                                                        </div>
                                                        <button onClick={() => setShowAudit(false)} className="text-gray-400 hover:text-white transition-colors">
                                                            <RefreshCcw size={12} className="rotate-45" />
                                                        </button>
                                                    </div>
                                                    <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar text-xs leading-relaxed text-gray-300 whitespace-pre-wrap font-sans">
                                                        <div className="space-y-4">
                                                            {auditResults}
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-black/40 border-t border-white/5 flex justify-end">
                                                        <button
                                                            onClick={() => { setShowRefineChat(true); setRefinementPrompt("Apply the SEO and accessibility fixes suggested in the audit."); setShowAudit(false); }}
                                                            className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black text-[10px] font-bold rounded-lg transition-all flex items-center gap-2"
                                                        >
                                                            <Sparkles size={10} />
                                                            Apply All Fixes
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <button
                                            onClick={() => setShowRefineChat(!showRefineChat)}
                                            className={`p-3 rounded-2xl shadow-xl transition-all border flex items-center gap-2 group/btn ${showRefineChat ? 'bg-white text-black border-white' : 'bg-primary text-primary-foreground border-primary/20 hover:scale-105'}`}
                                        >
                                            <Sparkles size={18} className={isRefining ? 'animate-pulse' : ''} />
                                            <span className={`text-xs font-bold overflow-hidden transition-all duration-300 ${showRefineChat ? 'w-0 opacity-0' : 'w-16 opacity-100'}`}>Ask AI</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {viewMode === 'split' && <div className="w-1 bg-black shadow-2xl z-10" />}

                        {(viewMode === 'preview' || viewMode === 'split') && (
                            <div className="flex-1 flex flex-col bg-[#f5f5f5] overflow-hidden">
                                <div className="h-10 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50 z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><div className="w-2.5 h-2.5 rounded-full bg-green-400" /></div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase ml-4 flex items-center gap-1">localhost:3000</span>
                                    </div>

                                    <div className="flex items-center gap-1 bg-gray-200/50 p-0.5 rounded-lg border border-gray-300/50">
                                        <button
                                            onClick={() => setPreviewSize('mobile')}
                                            className={`p-1 rounded-md transition-all ${previewSize === 'mobile' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            title="Mobile View"
                                        >
                                            <Monitor size={12} className="rotate-0 scale-[0.8] origin-center -rotate-90" />
                                        </button>
                                        <button
                                            onClick={() => setPreviewSize('tablet')}
                                            className={`p-1 rounded-md transition-all ${previewSize === 'tablet' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            title="Tablet View"
                                        >
                                            <Layout size={12} />
                                        </button>
                                        <button
                                            onClick={() => setPreviewSize('desktop')}
                                            className={`p-1 rounded-md transition-all ${previewSize === 'desktop' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            title="Desktop View"
                                        >
                                            <Monitor size={12} />
                                        </button>
                                    </div>

                                    <button onClick={() => { /* re-trigger useMemo */ }} className="text-gray-400 hover:text-gray-600"><RefreshCcw size={12} /></button>
                                </div>
                                <div className="flex-1 overflow-auto flex justify-center p-8 bg-[#f0f0f0] custom-scrollbar">
                                    <motion.div
                                        animate={{ width: previewWidths[previewSize] }}
                                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                                        className="h-full bg-white shadow-2xl border border-gray-200 rounded-lg overflow-hidden relative"
                                    >
                                        <iframe srcDoc={previewDoc} className="w-full h-full border-none" title="Preview" sandbox="allow-scripts" />
                                    </motion.div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
                    )}
                </main>
            </div>

            {/* Status Bar */}
            <footer className="h-6 border-t border-white/5 bg-[#141414] px-4 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <Loader2 size={10} className={isGenerating ? 'animate-spin text-primary' : 'hidden'} />
                        {isGenerating ? 'Generating code...' : 'Ready'}
                    </span>
                    <span>UTF-8</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>{selectedFile?.language?.toUpperCase()}</span>
                    <span className="text-primary/60">MultiAgent AI Core v1.0</span>
                </div>
            </footer>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
            `}</style>
        </div>
    );
}
