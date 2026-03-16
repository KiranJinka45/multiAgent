import React from 'react';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';

interface ShareOverlayProps {
  previewId: string;
  projectName?: string;
}

export const ShareOverlay: React.FC<ShareOverlayProps> = ({ previewId, projectName }) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-neutral-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-3 flex items-center justify-between gap-4">
        {/* Brand/Project Info */}
        <div className="flex items-center gap-4 pl-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={20} className="text-white fill-white/20" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 leading-none mb-1">
              Built with MultiAgent
            </span>
            <span className="text-sm font-bold text-white tracking-tight truncate max-w-[140px]">
              {projectName || `Project ${previewId.slice(0, 8)}`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a 
            href={`/remix/${previewId}?mode=prompt`}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold rounded-2xl transition-all border border-white/5 hover:border-white/10 group"
          >
            <Sparkles size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
            Remix with Prompt
          </a>
          
          <a 
            href={`/remix/${previewId}`}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/25 group/btn"
          >
            Remix
            <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
};
