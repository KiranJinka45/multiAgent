'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Link, Globe, Shield, Copy, Check, Twitter, Github } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SharePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function SharePreview({ isOpen, onClose, projectId }: SharePreviewProps) {
  const [isCopied, setIsCopied] = useState(false);
  const shareUrl = `https://multiagent.app/preview/${projectId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-[#18181B] border border-white/10 rounded-[2rem] w-full max-w-md p-8 space-y-8 shadow-2xl"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Share2 size={18} className="text-primary" />
                  Share Project
                </h3>
                <p className="text-xs text-gray-500 font-medium">Anyone with the link can view this preview.</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Public Link</label>
              <div className="flex items-center gap-2 bg-black/40 border border-white/5 p-2 rounded-xl">
                <div className="flex-1 px-3 py-2 text-xs font-medium text-gray-300 truncate">
                  {shareUrl}
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-primary transition-all"
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
                <Twitter size={14} className="text-sky-400" />
                Twitter
              </button>
              <button className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
                <Globe size={14} className="text-emerald-400" />
                Showcase
              </button>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
              <Shield size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-500/80 leading-relaxed font-medium">
                Public links exclude your API keys and environment variables. Secrets are redacted automatically by the AI Safety Layer.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
