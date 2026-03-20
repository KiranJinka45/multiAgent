'use client';

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'complete';
}

export default function BuildStatusTimeline({ currentStepId }: { currentStepId: 'planning' | 'generating' | 'fixing' | 'deploying' | 'complete' | 'error' | 'idle' }) {
  const steps: Step[] = [
    { id: 'planning', label: 'Architecting Solution', status: 'pending' },
    { id: 'generating', label: 'Generating Build Artifacts', status: 'pending' },
    { id: 'fixing', label: 'Autonomous Self-Healing', status: 'pending' },
    { id: 'deploying', label: 'Global Edge Deployment', status: 'pending' },
  ];

  const currentIdx = steps.findIndex(s => s.id === currentStepId);

  return (
    <div className="space-y-4 py-4">
      {steps.map((step, idx) => {
        const isComplete = idx < currentIdx || currentStepId === 'complete';
        const isLoading = idx === currentIdx;
        
        return (
          <div key={step.id} className="flex items-center gap-4 group">
            <div className="relative">
              {isComplete ? (
                <CheckCircle2 size={18} className="text-green-500" />
              ) : isLoading ? (
                <Loader2 size={18} className="text-primary animate-spin" />
              ) : (
                <Circle size={18} className="text-gray-700" />
              )}
              {idx !== steps.length - 1 && (
                <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-4 my-0.5 ${isComplete ? 'bg-green-500/30' : 'bg-gray-800'}`} />
              )}
            </div>
            <span className={`text-xs font-bold transition-colors ${isComplete ? 'text-gray-300' : isLoading ? 'text-white' : 'text-gray-600'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
