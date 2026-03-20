'use client';

import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Edit3, Settings, Bot, ShieldAlert } from 'lucide-react';

interface BuildErrorPanelProps {
  error: { message: string; code?: string };
  onRetry: () => void;
  onEdit: () => void;
  onAdvanced: () => void;
}

export default function BuildErrorPanel({ error, onRetry, onEdit, onAdvanced }: BuildErrorPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-[#18181B] border border-red-500/20 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
      >
        {/* Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 blur-[100px] rounded-full" />

        <div className="flex flex-col items-center text-center space-y-8 relative z-10">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center animate-pulse">
            <ShieldAlert size={40} className="text-red-500" />
          </div>

          <div className="space-y-3">
             <h2 className="text-3xl font-black tracking-tighter text-white">Engineering Mission Interrupted</h2>
             <p className="text-gray-400 text-sm font-medium leading-relaxed px-4">
                {error.message || "An unexpected error occurred during the autonomous build cycle. Our agents have halted the deployment for safety."}
             </p>
             {error.code && (
               <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                 <code className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{error.code}</code>
               </div>
             )}
          </div>

          <div className="w-full grid grid-cols-1 gap-3">
            <button 
              onClick={onRetry}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 group"
            >
              <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
              Fix Automatically (AI Retry)
            </button>
            
            <div className="grid grid-cols-2 gap-3">
               <button 
                 onClick={onEdit}
                 className="py-4 bg-white/5 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
               >
                 <Edit3 size={14} />
                 Edit Prompt
               </button>
               <button 
                 onClick={onAdvanced}
                 className="py-4 bg-white/5 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
               >
                 <Settings size={14} />
                 Advanced Mode
               </button>
            </div>
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
            System logs available for authorized personnel
          </p>
        </div>
      </motion.div>
    </div>
  );
}
