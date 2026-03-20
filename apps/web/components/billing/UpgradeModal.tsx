'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, X, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export default function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const router = useRouter();

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
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-[#18181B] border border-white/10 rounded-[2.5rem] w-full max-w-md p-8 relative shadow-2xl overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-500" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
                <ShieldAlert className="text-primary" size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tighter text-white">Unlock Unlimited Missions</h3>
                <p className="text-sm text-gray-400 font-medium px-4">
                  {reason || "You've reached your monthly build limit for the Hobby plan. Upgrade to Pro for unlimited autonomous builds."}
                </p>
              </div>

              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                  <span>CURRENT PLAN</span>
                  <span className="text-white">HOBBY</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-full" />
                </div>
              </div>

              <button 
                onClick={() => { onClose(); router.push('/pricing'); }}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-black text-sm hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
              >
                View Plans & Upgrade <ArrowRight size={18} />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
                Cancel or downgrade anytime • Enterprise SCIM supported
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
