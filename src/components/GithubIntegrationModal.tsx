'use client';

import { Github, X, ExternalLink, GitBranch, GitPullRequest, Code2, CheckCircle2, Lock, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { githubService, GithubRepo } from '@/lib/github-service';
import { useSidebar } from '@/context/SidebarContext';
import { toast } from 'sonner';

type GithubIntegrationModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function GithubIntegrationModal({ isOpen, onClose }: GithubIntegrationModalProps) {
    const { setIsGithubConnected } = useSidebar();
    const [isConnected, setIsConnected] = useState(false);
    const [repos, setRepos] = useState<GithubRepo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const checkConnection = useCallback(async () => {
        setIsLoading(true);
        try {
            const connected = await githubService.isConnected();
            setIsConnected(connected);
            setIsGithubConnected(connected);
            if (connected) {
                const data = await githubService.getRepositories();
                setRepos(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [setIsGithubConnected]);

    useEffect(() => {
        if (isOpen) {
            checkConnection();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }, [isOpen, checkConnection]);

    const handleConnect = async () => {
        try {
            await githubService.connect();
            // Redirect happens
        } catch {
            toast.error("Failed to connect GitHub");
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-background/80 backdrop-blur-md"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="flex items-center gap-3 md:gap-4">
                            <motion.div
                                animate={isConnected ? {} : {
                                    scale: [1, 1.05, 1],
                                    rotate: [0, 2, -2, 0]
                                }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center shadow-xl shrink-0"
                            >
                                <Github size={24} className="text-white md:hidden" />
                                <Github size={32} className="text-white hidden md:block" />
                            </motion.div>
                            <div>
                                <h2 className="text-lg md:text-2xl font-black tracking-tight">GitHub Integration</h2>
                                <p className="text-[10px] md:text-sm text-muted-foreground font-medium">Connect your repositories to MultiAgent</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all active:scale-95 text-muted-foreground">
                            <X size={20} className="md:hidden" />
                            <X size={24} className="hidden md:block" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Checking Authentication...</p>
                            </div>
                        ) : !isConnected ? (
                            <div className="space-y-6 md:space-y-8">
                                <div className="p-6 md:p-8 glass-card rounded-[1.5rem] md:rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 via-background to-transparent border-indigo-500/20 text-center space-y-4 md:space-y-6">
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto border border-indigo-500/20">
                                        <Lock size={28} className="text-indigo-400 md:hidden" />
                                        <Lock size={32} className="text-indigo-400 hidden md:block" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg md:text-xl font-bold">Connect your Account</h3>
                                        <p className="text-muted-foreground text-xs md:text-sm max-w-sm md:max-w-md mx-auto leading-relaxed font-medium">
                                            Enable deployments, PR reviews, and AI codebase analysis.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleConnect}
                                        className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-white text-black font-black rounded-xl md:rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
                                    >
                                        <Github size={20} />
                                        <span>Continue with GitHub</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                    {[
                                        { icon: GitBranch, label: 'Sync Branches', desc: 'Auto-sync code' },
                                        { icon: GitPullRequest, label: 'PR Automation', desc: 'AI reviews' },
                                        { icon: Code2, label: 'App Builder', desc: 'Deploy direct' },
                                    ].map((feature, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="p-4 rounded-2xl md:rounded-3xl bg-white/5 border border-white/5 text-center space-y-2"
                                        >
                                            <feature.icon size={18} className="mx-auto text-primary" />
                                            <div className="text-[10px] md:text-xs font-bold">{feature.label}</div>
                                            <div className="text-[9px] md:text-[10px] text-muted-foreground leading-tight font-medium opacity-60">{feature.desc}</div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Your Repositories</h3>
                                        <button
                                            onClick={checkConnection}
                                            className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground/40 hover:text-primary transition-all active:rotate-180 duration-500"
                                            title="Refresh Repositories"
                                        >
                                            <RotateCw size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest">
                                        <CheckCircle2 size={10} />
                                        Connected
                                    </div>
                                </div>

                                <div className="grid gap-2.5 md:gap-3">
                                    {repos.map((repo, i) => (
                                        <motion.div
                                            key={repo.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.08)" }}
                                            className="p-4 md:p-5 glass-card rounded-xl md:rounded-2xl border-white/5 bg-white/5 flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0">
                                                    <Code2 size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-xs md:text-sm tracking-tight truncate">{repo.name}</h4>
                                                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium opacity-60 truncate max-w-[200px] sm:max-w-full">{repo.description || 'No description'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 md:gap-4 shrink-0">
                                                <div className="text-[9px] md:text-[11px] font-bold text-muted-foreground hidden lg:block">
                                                    Synced {new Date(repo.updated_at).toLocaleDateString()}
                                                </div>
                                                <a href={repo.html_url} target="_blank" className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground transition-all">
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">MultiAgent GitHub Core</p>
                        <div className="text-[9px] md:text-[10px] text-muted-foreground/60 flex items-center gap-3">
                            <span className="hover:text-foreground cursor-pointer transition-colors font-bold uppercase">Privacy</span>
                            <span className="w-1 h-1 bg-white/10 rounded-full" />
                            <span className="hover:text-foreground cursor-pointer transition-colors font-bold uppercase">Terms</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
