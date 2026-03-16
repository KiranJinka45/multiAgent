"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Monitor,
    RefreshCcw,
    ExternalLink,
    CheckCircle2,
    Rocket,
    Globe,
    Smartphone,
    Loader2,
    AlertTriangle,
    Copy,
    Check
} from 'lucide-react';
import { BuildUpdate } from '@shared-types/build';

interface PreviewPanelProps {
    buildProgress: BuildUpdate | null;
    files: { path: string }[];
    onRedeploy: () => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ buildProgress, onRedeploy }) => {
    const [previewSize, setPreviewSize] = useState<'mobile' | 'desktop'>('desktop');
    const [showConfetti, setShowConfetti] = useState(false);
    const [confetti, setConfetti] = useState<{ left: string, duration: number, color: string }[]>([]);
    const [iframeStatus, setIframeStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [copied, setCopied] = useState(false);

    const isCompleted = buildProgress?.status === 'completed';
    const isExecuting = buildProgress?.status === 'executing';
    const previewUrl = buildProgress?.previewUrl ?? null;

    // Confetti trigger on completion
    useEffect(() => {
        if (isCompleted) {
            setShowConfetti(true);
            const colors = ['bg-blue-500', 'bg-blue-400', 'bg-white', 'bg-cyan-400'];
            const newConfetti = [...Array(20)].map(() => ({
                left: `${Math.random() * 100}%`,
                duration: 2 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)]
            }));
            setConfetti(newConfetti);
            const timer = setTimeout(() => setShowConfetti(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isCompleted]);

    // Reset iframe status when previewUrl changes
    useEffect(() => {
        if (previewUrl) setIframeStatus('loading');
    }, [previewUrl]);

    const widths = { mobile: '375px', desktop: '100%' };

    // Fallback static preview HTML (no CDN — pure inline CSS)
    const fallbackDoc = useMemo(() => `
      <html>
        <head>
           <style>
             *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
             @keyframes blob { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
             body {
               background: #030303; color: white;
               font-family: ui-sans-serif, system-ui, sans-serif;
               display: flex; align-items: center; justify-content: center;
               height: 100vh; overflow: hidden;
             }
             .card-wrapper { position: relative; }
             .glow-ring {
               position: absolute; inset: -4px;
               background: linear-gradient(to right, #3b82f6, #2563eb);
               border-radius: 9999px; filter: blur(8px); opacity: 0.25;
               animation: blob 5s infinite;
             }
             .card {
               position: relative; padding: 40px 48px; background: #0a0a0a;
               border: 1px solid rgba(255,255,255,0.1); border-radius: 24px;
               display: flex; flex-direction: column; align-items: center; text-align: center;
             }
             .icon-box {
               width: 80px; height: 80px; background: rgba(59,130,246,0.1);
               border: 1px solid rgba(59,130,246,0.2); border-radius: 16px;
               display: flex; align-items: center; justify-content: center; margin-bottom: 32px;
             }
             .icon-box svg { width: 40px; height: 40px; stroke: #3b82f6; }
             h2 { font-size: 30px; font-weight: 900; letter-spacing: -0.05em; margin-bottom: 12px; }
             p { color: rgba(255,255,255,0.4); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; margin-bottom: 32px; }
             .bars { display: flex; gap: 16px; }
             .bar { height: 4px; width: 48px; border-radius: 999px; }
             .bar-active { background: #3b82f6; }
             .bar-inactive { background: rgba(255,255,255,0.05); }
           </style>
        </head>
        <body>
           <div class="card-wrapper">
              <div class="glow-ring"></div>
              <div class="card">
                 <div class="icon-box">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                 </div>
                 <h2>ENVIRONMENT READY</h2>
                 <p>Isolated Sandbox • Node 20.x</p>
                 <div class="bars">
                    <div class="bar bar-active"></div>
                    <div class="bar bar-inactive"></div>
                    <div class="bar bar-inactive"></div>
                 </div>
              </div>
           </div>
        </body>
      </html>
    `, []);

    const handleCopy = () => {
        if (previewUrl) {
            navigator.clipboard.writeText(previewUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] relative overflow-hidden">
            {/* Confetti Layer */}
            <AnimatePresence>
                {showConfetti && (
                    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                        {confetti.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ top: '-10%', left: item.left, rotate: 0, opacity: 1 }}
                                animate={{ top: '110%', left: item.left, rotate: 360, opacity: 0 }}
                                transition={{ duration: item.duration, repeat: Infinity, ease: "linear" }}
                                className={`absolute w-2 h-2 rounded-full ${item.color}`}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {isCompleted ? (
                    <motion.div
                        key="preview-active"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col h-full overflow-hidden"
                    >
                        {/* Controls Bar */}
                        <div className="h-12 px-4 sm:px-6 border-b border-white/5 flex items-center justify-between gap-4 bg-[#0a0a0a]/50 backdrop-blur-md shrink-0 flex-wrap">
                            {/* URL Bar */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Globe size={12} className="text-green-500 animate-pulse shrink-0" />
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">
                                    {previewUrl || 'instance-sh82-deployment.local'}
                                </span>
                                {previewUrl && (
                                    <button onClick={handleCopy} className="shrink-0 text-white/30 hover:text-white transition-colors">
                                        {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                                    </button>
                                )}
                            </div>

                            {/* Size Switcher */}
                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
                                <button
                                    onClick={() => setPreviewSize('mobile')}
                                    title="Mobile view"
                                    className={`px-2 py-1 rounded-lg transition-all ${previewSize === 'mobile' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Smartphone size={12} />
                                </button>
                                <button
                                    onClick={() => setPreviewSize('desktop')}
                                    title="Desktop view"
                                    className={`px-2 py-1 rounded-lg transition-all ${previewSize === 'desktop' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Monitor size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Iframe Area */}
                        <div className="flex-1 bg-[#020202] p-2 sm:p-4 flex justify-center items-start overflow-y-auto custom-scrollbar">
                            <motion.div
                                animate={{ width: widths[previewSize] }}
                                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                                className="bg-[#0a0a0a] rounded-xl sm:rounded-[1.5rem] shadow-2xl overflow-hidden h-[450px] sm:h-[550px] border border-white/10 relative panel-depth group w-full max-w-full"
                            >
                                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-10" />

                                {/* Loading overlay while iframe initializes */}
                                {iframeStatus === 'loading' && previewUrl && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a0a]">
                                        <Loader2 size={32} className="animate-spin text-primary mb-3" />
                                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Loading Preview...</span>
                                    </div>
                                )}

                                {/* Error state */}
                                {iframeStatus === 'error' && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
                                        <AlertTriangle size={32} className="text-yellow-500" />
                                        <p className="text-[11px] text-white/40 uppercase font-bold tracking-widest text-center px-8">
                                            Preview server unreachable. The sandbox may still be starting.
                                        </p>
                                        <button
                                            onClick={() => setIframeStatus('loading')}
                                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}

                                {/* Actual iframe — uses real URL if available, else static inline HTML */}
                                {previewUrl ? (
                                    <iframe
                                        key={previewUrl}
                                        src={previewUrl}
                                        className="w-full h-full border-none"
                                        title="Project Preview"
                                        onLoad={() => setIframeStatus('loaded')}
                                        onError={() => setIframeStatus('error')}
                                        sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms"
                                        referrerPolicy="no-referrer"
                                        loading="lazy"
                                    />
                                ) : (
                                    <iframe
                                        srcDoc={fallbackDoc}
                                        className="w-full h-full border-none"
                                        title="Project Preview"
                                        onLoad={() => setIframeStatus('loaded')}
                                    />
                                )}
                            </motion.div>
                        </div>

                        {/* Success Footer */}
                        <div className="p-4 sm:p-6 bg-[#0a0a0a] border-t border-white/5 relative shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-t from-green-500/5 to-transparent pointer-events-none" />

                            <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-green-500/[0.03] rounded-2xl border border-green-500/20 shadow-inner relative z-10 mb-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-green-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(34,197,94,0.4)] shrink-0">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight mb-0.5">Infrastructure Provisioned</h3>
                                    <p className="text-[10px] text-green-500/80 font-bold uppercase tracking-widest truncate">Environment Status: Healthy • 100%</p>
                                </div>
                            </div>

                            <div className="flex gap-2 sm:gap-3 relative z-10">
                                <button
                                    onClick={onRedeploy}
                                    className="flex-1 py-3 bg-white/5 border border-white/10 text-white font-black rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                                >
                                    <RefreshCcw size={13} /> Redeploy
                                </button>
                                {previewUrl && (
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-[2] py-3 bg-primary text-white font-black rounded-xl hover:opacity-90 transition-all shadow-[0_10px_30px_-10px_rgba(59,130,246,0.5)] flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] active-border-glow"
                                    >
                                        <ExternalLink size={13} /> Open Live Version
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="preview-pending"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col h-full bg-[#030303] items-center justify-center p-8 sm:p-12 text-center"
                    >
                        <div className="relative mb-10 sm:mb-12">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="w-32 h-32 sm:w-48 sm:h-48 rounded-full border border-dashed border-primary/20 flex items-center justify-center"
                            >
                                <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-full border border-dashed border-primary/10" />
                            </motion.div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={isExecuting ? 'exec' : 'idle'}
                                        initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                        exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                                        transition={{ type: 'spring', damping: 15 }}
                                    >
                                        <Rocket size={40} className={isExecuting ? "text-primary shadow-[0_0_40px_rgba(59,130,246,0.2)]" : "text-white/5"} />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="space-y-3 max-w-xs sm:max-w-sm">
                            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase italic">Deploying Cloud Stack</h3>
                            <p className="text-[10px] sm:text-[11px] text-white/30 font-bold uppercase tracking-[0.2em] leading-relaxed">
                                The virtual runtime is being provisioned. Stand by for live synchronization.
                            </p>
                        </div>

                        <div className="mt-10 sm:mt-16 w-full space-y-4 max-w-xs opacity-20">
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                                <div className="absolute inset-0 shimmer" />
                            </div>
                            <div className="h-1.5 w-2/3 bg-white/5 rounded-full" />
                            <div className="h-1.5 w-1/2 bg-white/5 rounded-full mx-auto" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default React.memo(PreviewPanel);
