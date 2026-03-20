'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, CheckCircle2, ArrowRight } from 'lucide-react';
import BuildStatusTimeline from './BuildStatusTimeline';

interface ValueFirstBuildProps {
  isVisible: boolean;
  prompt: string;
  step: 'planning' | 'generating' | 'fixing' | 'deploying' | 'complete' | 'error' | 'idle';
  onComplete: () => void;
}

export default function ValueFirstBuild({ isVisible, prompt, step, onComplete }: ValueFirstBuildProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
        >
          <div className="max-w-xl w-full space-y-12 text-center">
            {/* Header */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Rocket className="text-primary animate-bounce" size={32} />
              </div>
              <h2 className="text-3xl font-black tracking-tighter text-white">
                Initiating Autonomous Build
              </h2>
              <p className="text-gray-400 font-medium">
                Our agent grid is constructing your vision: <span className="text-primary italic">&quot;{prompt}&quot;</span>
              </p>
            </motion.div>

            {/* Timeline */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-left">
              <BuildStatusTimeline currentStepId={step} />
            </div>

            {/* Completion Action */}
            {step === 'complete' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-center gap-2 text-green-500 font-bold">
                  <CheckCircle2 size={24} />
                  Build Ready in Record Time
                </div>
                <button 
                  onClick={onComplete}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-black text-lg hover:scale-105 transition-all flex items-center gap-3 mx-auto shadow-2xl shadow-primary/20"
                >
                  Enter Your New App <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {/* Footer Fact */}
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
              Powered by MultiAgent Orchestrator • Safe Sandboxed Execution
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
