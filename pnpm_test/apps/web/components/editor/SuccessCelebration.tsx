'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Twitter, ArrowRight, X } from 'lucide-react';

interface SuccessCelebrationProps {
  previewUrl: string | null;
  projectName?: string;
  duration?: number;
}

export const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({ previewUrl, projectName, duration }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!previewUrl || !isVisible) return null;

  const fullUrl = previewUrl?.startsWith('http') ? previewUrl : `${window.location.origin}${previewUrl}`;
  const tweetMessage = duration 
    ? `I just built ${projectName || 'a full app'} in ${duration} seconds using MultiAgent AI! 🤯`
    : `I just built ${projectName || 'a full app'} in 2 minutes using MultiAgent AI! 🤯`;
    
  const tweetText = `${tweetMessage} Check it out live: ${fullUrl} #AI #BuildWithAI @MultiAgentAI`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-none p-6">
        {/* Background Overlay Backdrop */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
            onClick={() => setIsVisible(false)}
        />

        {/* Content Card */}
        <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-[#0A0A0B] border border-white/10 rounded-[3rem] p-10 max-w-lg w-full shadow-[0_32px_128px_rgba(0,0,0,0.8)] text-center pointer-events-auto overflow-hidden"
        >
            {/* Glow Effect */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full" />

            {/* Close Button */}
            <button 
                onClick={() => setIsVisible(false)}
                className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
            >
                <X size={20} />
            </button>

            <div className="relative z-10 space-y-8">
                {/* Success Icon */}
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                    className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20"
                >
                    <CheckCircle2 size={48} className="text-white" />
                </motion.div>

                <div className="space-y-3">
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        Success in {duration || '90'}s<span className="text-emerald-500">.</span>
                    </h2>
                    <p className="text-neutral-400 text-lg leading-relaxed">
                        Mission accomplished. Your autonomous application is now live.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <a 
                        href={twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full py-4 bg-[#1DA1F2] hover:bg-[#1A91DA] text-white font-black rounded-2xl transition-all shadow-xl shadow-[#1DA1F2]/20 group"
                    >
                        <Twitter size={20} className="group-hover:scale-110 transition-transform" />
                        🚀 Share My App
                    </a>
                    
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="flex items-center justify-center gap-3 w-full py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/20 group"
                    >
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        ✨ Build Another App
                    </button>

                    <button 
                        onClick={() => setIsVisible(false)}
                        className="flex items-center justify-center gap-3 w-full py-4 bg-white/5 hover:bg-white/10 text-white/80 font-bold rounded-2xl transition-all border border-white/10"
                    >
                        🛠️ Customize (Advanced Mode)
                    </button>
                </div>

                <div className="pt-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">
                        MultiAgent Hyper-Growth Cluster
                    </span>
                </div>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
