'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { BuildStepId } from '@/store/useProjectStore';

const steps: BuildStepId[] = ['planning', 'generating', 'fixing', 'deploying', 'complete'];

interface BuildStatusTimelineProps {
  current: BuildStepId;
}

export default function BuildStatusTimeline({ current }: BuildStatusTimelineProps) {
  const currentIndex = steps.indexOf(current);

  if (current === 'idle') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
        <div className="relative flex justify-between animate-pulse">
          <div className="absolute top-[18px] left-0 w-full h-0.5 bg-white/5" />
          {steps.map((step) => (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-white/5 border-2 border-white/5 flex items-center justify-center">
                 <Circle size={12} className="text-gray-800" />
              </div>
              <div className="mt-3 h-2 w-12 bg-white/5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="relative flex justify-between">
        {/* Background Line */}
        <div className="absolute top-[18px] left-0 w-full h-0.5 bg-white/5" />
        
        {/* Progress Line */}
        <motion.div 
          className="absolute top-[18px] left-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />

        {steps.map((step, i) => {
          const isDone = i < currentIndex || current === 'complete';
          const isActive = i === currentIndex && current !== 'complete';
          const isError = current === 'error';
  // Use isError to trigger recovery visuals or logging
  if (isError) {
    console.debug('[Timeline] Failure state active');
  }

          return (
            <div key={step} className="relative z-10 flex flex-col items-center group">
              <motion.div 
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isDone ? 'rgb(var(--primary-rgb))' : isActive ? '#1e1e1e' : '#111',
                  borderColor: isDone ? 'rgb(var(--primary-rgb))' : isActive ? 'rgb(var(--primary-rgb))' : 'rgba(255,255,255,0.1)'
                }}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all shadow-xl ${isActive ? 'shadow-primary/20' : ''}`}
              >
                {isDone ? (
                  <CheckCircle2 size={18} className="text-white" />
                ) : isActive ? (
                  <Loader2 size={18} className="text-primary animate-spin" />
                ) : (
                  <Circle size={12} className="text-gray-600" />
                )}
              </motion.div>
              
              <div className="mt-3 text-center">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-primary' : isDone ? 'text-white' : 'text-gray-600'}`}>
                  {step}
                </p>
                {isActive && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[9px] font-bold text-primary/60 mt-0.5 whitespace-nowrap"
                  >
                    Processing...
                  </motion.p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {current === 'error' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-3"
        >
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Mission Interrupted: Recovery in Progress</span>
        </motion.div>
      )}
    </div>
  );
}
