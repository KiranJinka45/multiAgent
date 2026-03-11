'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PushToGithubModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    defaultRepoName: string;
}

export default function PushToGithubModal({ isOpen, onClose, projectId, defaultRepoName }: PushToGithubModalProps) {
    const [repoName, setRepoName] = useState(defaultRepoName.replace(/\s+/g, '-').toLowerCase());
    const [isPrivate, setIsPrivate] = useState(true);
    const [isPushing, setIsPushing] = useState(false);
    const [successUrl, setSuccessUrl] = useState<string | null>(null);

    const handlePush = async () => {
        if (!repoName.trim()) {
            toast.error('Repository name is required');
            return;
        }

        setIsPushing(true);
        try {
            const res = await fetch('/api/github/create-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    repoName: repoName.trim(),
                    isPrivate
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to push to GitHub');
            }

            toast.success('Successfully pushed to GitHub!');
            setSuccessUrl(data.url);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsPushing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden relative"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                        disabled={isPushing}
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                <Github size={24} className="text-black" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Push to GitHub</h2>
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Deploy securely</p>
                            </div>
                        </div>

                        {successUrl ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-2">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-white uppercase tracking-widest">Commit Successful</h3>
                                <p className="text-sm text-white/50 mb-4">Your repository is now live on GitHub.</p>
                                <a
                                    href={successUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white/90 transition-all shadow-xl"
                                >
                                    Open Repository
                                </a>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-white/60 uppercase tracking-widest">Repository Name</label>
                                        <input
                                            type="text"
                                            value={repoName}
                                            onChange={(e) => setRepoName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-all text-white placeholder-white/20"
                                            placeholder="my-awesome-project"
                                            disabled={isPushing}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">Private Repository</span>
                                            <span className="text-xs text-white/40">Only you can see this repository</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsPrivate(!isPrivate)}
                                            disabled={isPushing}
                                            className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${isPrivate ? 'bg-primary' : 'bg-white/10'}`}
                                        >
                                            <motion.div
                                                className="w-4 h-4 rounded-full bg-white absolute"
                                                animate={{ left: isPrivate ? '28px' : '4px' }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePush}
                                    disabled={isPushing}
                                    className="w-full py-4 mt-4 bg-white text-black flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white/90 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPushing ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Committing...
                                        </>
                                    ) : (
                                        <>
                                            <Github size={16} />
                                            Create & Push
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
