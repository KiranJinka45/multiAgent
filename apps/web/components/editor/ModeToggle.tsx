'use client';

import { Eye, Code } from 'lucide-react';

interface ModeToggleProps {
  mode: 'simple' | 'advanced';
  onToggle: (mode: 'simple' | 'advanced') => void;
}

export default function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  return (
    <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 p-y-2">
      <button 
        onClick={() => onToggle('simple')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'simple' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-gray-500 hover:text-white'}`}
      >
        <Eye size={14} />
        Simple
      </button>
      <button 
        onClick={() => onToggle('advanced')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'advanced' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-gray-500 hover:text-white'}`}
      >
        <Code size={14} />
        Advanced
      </button>
    </div>
  );
}
