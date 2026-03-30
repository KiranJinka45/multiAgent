'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

/**
 * Global Next.js Error Boundary for the root app directory.
 * Standardizes the "Something went wrong" UI across the entire SaaS.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('System Exception:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#080808] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-8"
      >
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
          <AlertTriangle className="text-red-500" size={40} />
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-black text-white tracking-widest uppercase italic">System Disruption</h1>
          <p className="text-sm text-white/40 leading-relaxed">
            An unexpected technical anomaly has interrupted the Mission Control interface.
            Our diagnostic systems have been notified.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-left">
            <p className="text-[10px] text-red-400 font-mono break-all">{error.message}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm hover:bg-white/10 transition-all group"
          >
            <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
            Retry
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-primary rounded-2xl text-primary-foreground font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-primary/20"
          >
            <Home size={18} />
            Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
