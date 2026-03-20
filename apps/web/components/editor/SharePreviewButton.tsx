'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SharePreviewButtonProps {
  previewUrl: string | null;
}

export default function SharePreviewButton({ previewUrl }: SharePreviewButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy preview URL:', err);
    }
  };

  return (
     <div className="relative">
      <button 
        onClick={handleShare}
        disabled={!previewUrl}
        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all rounded-lg text-[10px] font-black uppercase tracking-widest text-primary disabled:opacity-50 group"
      >
        {copied ? (
          <Check size={12} className="animate-scale-up" />
        ) : (
          <Share2 size={12} className="group-hover:scale-110 transition-transform" />
        )}
        {copied ? 'Copied' : 'Share App'}
      </button>

      <AnimatePresence>
        {copied && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg z-50 whitespace-nowrap"
          >
            Mission Live Link Copied
          </motion.div>
        )}
      </AnimatePresence>
     </div>
  );
}
