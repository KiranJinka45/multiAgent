'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Globe, Monitor, Smartphone, RefreshCcw, Zap, Eye, GitFork } from 'lucide-react';

interface PreviewPanelProps {
  url: string | null;
  prompt?: string | null;
}

export default function PreviewPanel({ url, prompt }: PreviewPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [stats, setStats] = useState({ remixCount: 0, viewCount: 0 });

  useEffect(() => {
    if (url) {
        // Extract previewId from url (e.g., /preview/123)
        const id = url.split('/').pop()?.split('?')[0];
        if (id) {
            fetch(`/api/stats/preview/${id}`)
                .then(res => res.json())
                .then(data => setStats(data))
                .catch(() => {});
        }
    }
  }, [url]);

  if (!url) {
    return (
      <div className="h-full flex flex-col bg-[#0A0A0B] p-4 font-sans">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-4">
             <div className="w-24 h-6 bg-white/5 rounded-full animate-pulse" />
             <div className="w-16 h-6 bg-white/5 rounded-lg animate-shimmer" />
          </div>
          <div className="w-48 h-6 bg-white/5 rounded-lg animate-pulse" />
        </div>
        <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-4 overflow-hidden relative">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer -translate-x-full" />
           <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center animate-bounce">
             <Globe size={32} className="text-gray-700" />
           </div>
           <div className="text-center space-y-2">
             <div className="h-3 w-40 bg-white/10 rounded-full mx-auto animate-pulse" />
             <div className="h-2 w-24 bg-white/5 rounded-full mx-auto" />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0A0B] p-4 font-sans">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Preview</span>
          </div>
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
            <button 
              onClick={() => setViewMode('desktop')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Monitor size={14} />
            </button>
            <button 
              onClick={() => setViewMode('mobile')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Smartphone size={14} />
            </button>
          </div>
          
          <div className="flex items-center gap-3 ml-2">
            <div className="flex items-center gap-1.5 text-gray-500">
                <Eye size={14} />
                <span className="text-[10px] font-bold">{stats.viewCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary">
                <GitFork size={14} className={stats.remixCount > 10 ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-bold">{stats.remixCount}</span>
                {stats.remixCount > 10 && <span className="text-[8px] font-black uppercase tracking-tighter ml-0.5">🔥 TRENDING</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsLoading(true)}
             className="p-2 text-gray-500 hover:text-white transition-colors rotate-0 hover:rotate-180 duration-500"
            >
             <RefreshCcw size={14} />
           </button>
           <button 
             onClick={() => {
                if (prompt) {
                  window.location.href = `/?prompt=${encodeURIComponent(prompt)}`;
                }
             }}
             className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-black uppercase text-primary hover:bg-primary/20 transition-all hover:scale-105 active:scale-95"
           >
             <Zap size={12} fill="currentColor" />
             Remix this App
           </button>
           <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 truncate max-w-[200px]">
             {url}
           </div>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <div className={`relative bg-white rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'}`}>
          <AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#1e1e1e] flex flex-col items-center justify-center z-10"
              >
                <Loader2 size={32} className="text-primary animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Injecting Runtime...</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <iframe 
            src={url}
            className="w-full h-full border-none"
            onLoad={() => setIsLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
}
