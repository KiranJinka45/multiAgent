'use client';

import { Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const InstantDemo: React.FC = () => {
  // A high-quality pre-built demo app
  const DEMO_URL = 'https://demo-saas-dashboard.vercel.app'; 

  return (
    <div className="flex-1 w-full bg-white relative rounded-t-[2.5rem] overflow-hidden shadow-2xl border-t border-white/5 flex flex-col">
      {/* Demo Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between pointer-events-none">
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 px-4 py-2 bg-blue-600/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl pointer-events-auto"
        >
            <Loader2 size={16} className="text-white animate-spin" />
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/70 leading-none">
                    Mission Provisioning
                </span>
                <span className="text-xs font-bold text-white">
                    Architecting your custom build...
                </span>
            </div>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-full"
        >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">
                Live Interactive Demo
            </span>
        </motion.div>
      </div>

      <iframe 
        src={DEMO_URL} 
        className="w-full h-full border-none opacity-80"
        title="MultiAgent Live Demo"
      />

      {/* Glass Footer Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-lg px-6 pointer-events-none">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-4 flex items-center gap-4 shadow-2xl pointer-events-auto"
        >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Zap size={24} className="text-white fill-white/20" />
            </div>
            <div className="flex-1 flex flex-col">
                <span className="text-sm font-bold text-white tracking-tight">
                    Don&apos;t wait. Explore.
                </span>
                <span className="text-xs text-white/50 leading-relaxed">
                    This is a live preview of a SaaS Dashboard template. Your unique app will replace this in seconds.
                </span>
            </div>
        </motion.div>
      </div>
    </div>
  );
};
