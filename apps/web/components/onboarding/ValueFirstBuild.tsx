'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Code, Sparkles, CheckCircle2, Loader2, Bot } from 'lucide-react';

interface ValueFirstBuildProps {
  onComplete: () => void;
}

const STEPS = [
  { id: 'logic', icon: Brain, label: 'Understanding your idea...', detail: 'AI Architect parsing requirements' },
  { id: 'infra', icon: Code, label: 'Designing architecture...', detail: 'Selecting optimal tech stack & database schema' },
  { id: 'artifacts', icon: Sparkles, label: 'Generating code...', detail: 'Scaffolding components and backend modules' },
];

export default function ValueFirstBuild({ onComplete }: ValueFirstBuildProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (currentStep < STEPS.length) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 2000); // 2 seconds per simulated step
      return () => clearTimeout(timer);
    } else {
      setIsFinishing(true);
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(finishTimer);
    }
  }, [currentStep, onComplete]);

  return (
    <AnimatePresence>
      {!isFinishing && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6 overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full" />
          
          <div className="max-w-md w-full space-y-12 relative z-10 text-center">
            <div className="space-y-4">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-primary/20 rounded-3xl mx-auto flex items-center justify-center border border-primary/20 shadow-2xl shadow-primary/20"
              >
                <Bot size={40} className="text-primary animate-pulse" />
              </motion.div>
              <h1 className="text-3xl font-black tracking-tighter text-white">Initiating Protocol</h1>
              <p className="text-gray-500 text-sm font-medium">Sit back. Our agent swarm is architecting your vision in real-time.</p>
            </div>

            <div className="space-y-6">
              {STEPS.map((step, i) => {
                const isActive = i === currentStep;
                const isCompleted = i < currentStep;

                return (
                  <motion.div 
                    key={step.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: isActive || isCompleted ? 1 : 0.2 }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 ${isActive ? 'bg-white/5 border-white/10 scale-105 shadow-xl' : isCompleted ? 'bg-transparent border-transparent' : 'bg-transparent border-transparent'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCompleted ? 'bg-emerald-500/10 text-emerald-500' : isActive ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-700'}`}>
                      {isCompleted ? <CheckCircle2 size={20} /> : <step.icon size={20} className={isActive ? 'animate-bounce' : ''} />}
                    </div>
                    <div className="text-left flex-1">
                      <p className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>{step.label}</p>
                      {isActive && <p className="text-[10px] text-gray-500 font-bold mt-0.5 animate-pulse">{step.detail}</p>}
                    </div>
                    {isActive && <Loader2 size={16} className="text-primary animate-spin" />}
                  </motion.div>
                );
              })}
            </div>

            <div className="pt-8">
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                 <motion.div 
                   className="h-full bg-primary"
                   initial={{ width: '0%' }}
                   animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                 />
              </div>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] mt-4">MultiAgent Orchestrator v4.2</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
