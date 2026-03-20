'use client';

import { useState } from 'react';
import { GitFork, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ForkProjectButtonProps {
  projectId: string | null;
}

export default function ForkProjectButton({ projectId }: ForkProjectButtonProps) {
  const [isForking, setIsForking] = useState(false);
  const router = useRouter();

  const handleFork = async () => {
    if (!projectId) return;
    setIsForking(true);
    try {
      const res = await fetch('/api/project/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.newProjectId) {
         router.push(`/editor?projectId=${data.newProjectId}&auto=true`);
      }
    } catch (err) {
      console.error('Failed to fork project:', err);
    } finally {
      setIsForking(false);
    }
  };

  return (
    <button 
      onClick={handleFork}
      disabled={isForking || !projectId}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 hover:border-white/20 transition-all rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-50"
    >
      {isForking ? (
        <Loader2 size={12} className="animate-spin text-primary" />
      ) : (
        <GitFork size={12} className="text-purple-500" />
      )}
      {isForking ? 'Cloning Meta...' : 'Fork Project'}
    </button>
  );
}
