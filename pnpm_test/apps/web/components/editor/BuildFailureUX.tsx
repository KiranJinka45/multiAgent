'use client';

import { AlertCircle, RefreshCw, Edit3, Layout, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface BuildFailureUXProps {
  error: { message: string; code?: string };
  onRetry: () => void;
  onEditPrompt: () => void;
  onOpenAdvanced: () => void;
}

export default function BuildFailureUX({ error, onRetry, onEditPrompt, onOpenAdvanced }: BuildFailureUXProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-[#1e1e1e] border border-red-500/20 rounded-3xl p-8 shadow-2xl space-y-8"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
          <AlertCircle className="text-red-500" size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tighter text-white">Build Interrupted</h3>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            {error.message || "Something went wrong during the autonomous generation phase. Our agents are standing by to help."}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button 
          onClick={onRetry}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-98 transition-all"
        >
          <RefreshCw size={16} />
          AI Fix & Retry
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onEditPrompt}
            className="py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Edit3 size={12} />
            Edit Prompt
          </button>
          <button 
            onClick={onOpenAdvanced}
            className="py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Layout size={12} />
            Advanced
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5">
        <div className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-4">Possible Root Causes</div>
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
             <ChevronRight size={10} className="text-primary" />
             Ambiguous UI requirements
           </div>
           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
             <ChevronRight size={10} className="text-primary" />
             Package dependency resolution failure
           </div>
        </div>
      </div>
    </motion.div>
  );
}
