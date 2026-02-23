'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, PlayCircle, Code2, Server, Wrench, RefreshCw, Rocket } from 'lucide-react';
import { toast } from 'sonner';

interface AionGeneratorProps {
    prompt: string;
    onComplete?: () => void;
}

const steps = [
    { id: 'architecting', label: 'Architecting Stack', icon: Wrench, desc: 'Planning the component structure and DB schema' },
    { id: 'generating_swarm', label: 'Parallel Swarm Execution', icon: Code2, desc: 'Async generation of Next.js, FastAPI, and Docker configs' },
    { id: 'security_scanning', label: 'DevSecOps Scan', icon: Server, desc: 'Deep vulnerability scanning before building' },
    { id: 'sandbox_execution_attempt_1', label: 'Sandbox Validation', icon: PlayCircle, desc: 'Running dry build to detect syntax errors' },
    { id: 'deploying', label: 'Deploying', icon: Rocket, desc: 'Pushing to Vercel and Fly.io' },
];

export default function AionGeneratorView({ prompt, onComplete }: AionGeneratorProps) {
    const [jobId, setJobId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('initializing');
    const [manifest, setManifest] = useState<Record<string, unknown> | null>(null);
    const [urls, setUrls] = useState<{ frontend?: string; backend?: string } | null>(null);

    useEffect(() => {
        // 1. Trigger the Generation Job
        const startJob = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, project_name: 'aion-app-' + Math.floor(Math.random() * 1000) }),
                });

                if (!response.ok) throw new Error('Failed to start generation');
                const data = await response.json();
                setJobId(data.job_id);
            } catch (error) {
                console.error("Start error:", error);
                toast.error("Failed to connect to Aion Orchestrator (is it running on port 8000?)");
                setStatus('failed');
            }
        };

        startJob();
    }, [prompt]);

    useEffect(() => {
        // 2. Poll the status every 2 seconds
        if (!jobId || status === 'completed' || status.startsWith('failed')) return;

        const poll = setInterval(async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/status/${jobId}`);
                if (res.ok) {
                    const data = await res.json();
                    setStatus(data.status);

                    if (data.status === 'completed') {
                        clearInterval(poll);
                        setManifest(data.manifest);
                        setUrls(data.deployment_urls);
                        toast.success("Project generated and deployed!");
                    }
                }
            } catch (err) {
                console.error("Poll error:", err);
            }
        }, 2000);

        return () => clearInterval(poll);
    }, [jobId, status, onComplete]);

    // Determine active step index
    const activeIndex = steps.findIndex(s => s.id === status);
    // Auto-fixing happens inside the sandbox step visually
    const isAutoFixing = status.includes('auto_fixing');
    const displayIndex = status === 'completed' ? steps.length : (activeIndex === -1 ? (isAutoFixing ? 3 : 0) : activeIndex);

    const [showManifest, setShowManifest] = useState(false);

    return (
        <div className="w-full max-w-4xl mx-auto p-6 mt-8 space-y-8">
            <div className="text-center space-y-2 relative">
                <h2 className="text-2xl font-bold tracking-tight">Project Aion Builder</h2>
                <p className="text-muted-foreground text-sm">
                    {status === 'completed'
                        ? 'Your application is ready to use!'
                        : `Generating app based on: "${prompt}"`}
                </p>
                {status === 'completed' && onComplete && (
                    <button onClick={onComplete} className="absolute right-0 top-0 text-sm text-muted-foreground hover:text-foreground">
                        Close
                    </button>
                )}
            </div>

            <div className="glass-card rounded-3xl p-8 border border-white/5 relative overflow-hidden">
                {/* Progress Tracker */}
                <div className="relative space-y-6">
                    {steps.map((step, idx) => {
                        const isCompleted = idx < displayIndex;
                        const isActive = idx === displayIndex;

                        return (
                            <div key={step.id} className="flex flex-col gap-1 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 shadow-sm
                    ${isCompleted ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' :
                                            isActive ? 'bg-primary text-primary-foreground shadow-primary/25 border-none' :
                                                'bg-foreground/5 text-muted-foreground border border-white/5'}
                  `}>
                                        {isCompleted ? <CheckCircle2 size={20} /> :
                                            isActive ? (isAutoFixing ? <RefreshCw size={20} className="animate-spin" /> : <Loader2 size={20} className="animate-spin" />) :
                                                <step.icon size={20} />}
                                    </div>

                                    <div className="flex-1">
                                        <h4 className={`text-[15px] font-semibold transition-colors duration-300 ${isActive || isCompleted ? 'text-foreground' : 'text-foreground/50'}`}>
                                            {isActive && isAutoFixing ? 'Self-Healing (Auto-Fixing Build Errors)' : step.label}
                                        </h4>
                                        <p className="text-[13px] text-muted-foreground/70">{step.desc}</p>
                                    </div>
                                </div>

                                {/* Vertical Line Connector */}
                                {idx < steps.length - 1 && (
                                    <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px]">
                                        <div className={`h-full transition-all duration-700 ${isCompleted ? 'bg-emerald-500/30' : 'bg-foreground/5'}`} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Completion State */}
            {status === 'completed' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-3xl p-6 border border-emerald-500/20 bg-emerald-500/5 text-center space-y-4"
                >
                    <div className="inline-flex w-16 h-16 rounded-full bg-emerald-500/20 items-center justify-center text-emerald-500 mb-2">
                        <Rocket size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Deployment Successful!</h3>
                    <p className="text-sm text-muted-foreground">Your infrastructure has been provisioned and deployed via Vercel/Fly.io.</p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                        {urls?.frontend && (
                            <a href={urls.frontend} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                                Open Frontend
                            </a>
                        )}
                        {manifest && (
                            <button onClick={() => setShowManifest(!showManifest)} className="px-6 py-2.5 rounded-xl bg-foreground/10 text-foreground font-medium hover:bg-foreground/15 transition-colors">
                                {showManifest ? 'Hide' : 'View'} Architecture Manifest
                            </button>
                        )}
                    </div>

                    {showManifest && manifest && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 p-4 bg-background border border-white/5 rounded-xl text-left overflow-x-auto overflow-y-auto max-h-80 text-xs font-mono text-muted-foreground">
                            <pre>{JSON.stringify(manifest, null, 2)}</pre>
                        </motion.div>
                    )}
                </motion.div>
            )}

            {status.startsWith('failed') && (
                <div className="glass-card rounded-2xl p-6 border border-red-500/20 bg-red-500/5 text-center text-red-500 font-medium">
                    Generation Failed. {status}
                </div>
            )}
        </div>
    );
}
