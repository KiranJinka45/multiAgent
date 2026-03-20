'use client';

import React from 'react';
import { Sparkles, ArrowRight, Zap, GitFork, Twitter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GrowthHeaderProps {
  previewId: string;
  projectName?: string;
  prompt?: string;
}

export const GrowthHeader: React.FC<GrowthHeaderProps> = ({ previewId, projectName, prompt }) => {
  const router = useRouter();

  const handleRemix = async () => {
    // Track remix (non-blocking)
    fetch('/api/analytics/remix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewId }),
    }).catch(() => {});

    // Redirect to landing with prompt
    if (prompt) {
        router.push(`/?prompt=${encodeURIComponent(prompt)}`);
    } else {
        router.push('/');
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] p-4 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="max-w-7xl mx-auto bg-[#0A0A0B]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.4)] p-3 flex items-center justify-between gap-4">
        {/* Brand Info */}
        <div className="flex items-center gap-4 pl-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={20} className="text-white fill-white/20" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 leading-none mb-1">
              Built with MultiAgent
            </span>
            <span className="text-sm font-bold text-white tracking-tight truncate max-w-[200px]">
              {projectName || `Project ${previewId.slice(0, 8)}`}
            </span>
          </div>
        </div>

        {/* AHA Moment Copy (Desktop) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
            <Sparkles size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">
                Created in under 120 seconds
            </span>
        </div>

        {/* Viral Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
                const tweetText = `I just built ${projectName || 'a full app'} in 2 minutes using MultiAgent AI! 🤯 Check it out live: ${window.location.origin}/share/${previewId} #AI #BuildWithAI @MultiAgentAI`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] text-xs font-semibold rounded-2xl transition-all border border-[#1DA1F2]/10"
          >
            <Twitter size={14} className="fill-current" />
            Share
          </button>
          
          <button 
            onClick={handleRemix}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-blue-500/25 group scale-100 hover:scale-[1.02] active:scale-[0.98]"
          >
            ✨ Build your own version
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
