'use client';

import React from 'react';
import { Zap } from 'lucide-react';

export const RemixWatermark: React.FC = () => {
  return (
    <div className="fixed bottom-6 right-6 z-[1000] animate-in fade-in slide-in-from-bottom-2 duration-1000">
      <a 
        href="/"
        className="flex items-center gap-3 px-4 py-2 bg-[#0A0A0B]/60 backdrop-blur-xl border border-white/10 rounded-2xl group hover:bg-blue-600/10 hover:border-blue-500/20 transition-all shadow-lg"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md">
          <Zap size={14} className="text-white fill-white/20 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white/50 leading-none mb-1 group-hover:text-blue-400 transition-colors">
            Built with MultiAgent
          </span>
          <span className="text-[10px] font-bold text-white/80 leading-none">
            Create yours in 120s →
          </span>
        </div>
      </a>
    </div>
  );
};
