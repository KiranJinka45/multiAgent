'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { githubService, type GithubRepo } from '@packages/utils';
import { PreviewRegistry } from '@packages/registry';
import { ShareOverlay } from '@/components/ShareOverlay';
import { Loader2 } from 'lucide-react';

export default function SharePage({ params }: { params: { id: string } }) {
    const previewId = params.id;
    const [reg, setReg] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRegistry = async () => {
            try {
                let r = await PreviewRegistry.lookupByPreviewId(previewId);
                if (!r) {
                    r = await PreviewRegistry.get(previewId);
                }
                setReg(r);
            } catch (err) {
                console.error('Failed to load registry:', err);
            } finally {
                setLoading(false);
            }
        };
        loadRegistry();
    }, [previewId]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    if (!reg) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-white p-6">
                <div className="text-center space-y-6 max-w-sm">
                    <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
                        <span className="text-4xl font-black text-red-500">!</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Sandbox Lost</h1>
                        <p className="text-neutral-500 text-sm leading-relaxed">
                            This autonomous sandbox may have expired or been deleted. 
                            Build your own in seconds with MultiAgent.
                        </p>
                    </div>
                    <a 
                        href="/"
                        className="inline-block px-8 py-3 bg-white text-black font-bold rounded-2xl hover:bg-neutral-200 transition-colors"
                    >
                        Build Now
                    </a>
                </div>
            </div>
        );
    }

    const isRunning = reg.status === 'RUNNING';
    const previewUrl = isRunning 
        ? `/preview/${previewId}${reg.accessToken ? `?token=${reg.accessToken}` : ''}`
        : null;

    return (
        <div className="fixed inset-0 bg-[#050505] overflow-hidden selection:bg-blue-500/30">
            {!isRunning ? (
                <div className="flex flex-col items-center justify-center h-full gap-10 animate-in fade-in zoom-in duration-1000 px-6">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-600/30 blur-[100px] rounded-full group-hover:bg-blue-600/50 transition-colors" />
                        <div className="w-24 h-24 rounded-[2.5rem] bg-neutral-900 border border-white/10 flex items-center justify-center relative z-10 animate-pulse overflow-hidden">
                            <Loader2 size={40} className="text-blue-500 animate-spin" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent pointer-events-none" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">
                                Global Registry
                            </span>
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter sm:text-4xl">
                            Waking up Sandbox<span className="text-blue-500">.</span>
                        </h2>
                        <p className="text-neutral-500 text-sm max-w-[280px] leading-relaxed">
                            Bringing the autonomous environment online. This page will refresh automatically.
                        </p>
                    </div>
                    <meta httpEquiv="refresh" content="4" />
                </div>
            ) : (
                <>
                    <iframe 
                        src={previewUrl!} 
                        className="w-full h-full border-none opacity-0 animate-in fade-in fill-mode-forwards duration-1000 delay-300"
                        title="Built with MultiAgent"
                    />
                    <ShareOverlay previewId={previewId} />
                </>
            )}
        </div>
    );
}
