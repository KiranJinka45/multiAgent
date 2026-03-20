'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProjectStore } from '@/store/useProjectStore';
import BuildStatusTimeline from '@/components/BuildStatusTimeline';
import PreviewPanel from '@/components/PreviewPanel';
import BuildErrorPanel from '@/components/editor/BuildErrorPanel';
import ValueFirstBuild from '@/components/onboarding/ValueFirstBuild';
import SharePreviewButton from '@/components/editor/SharePreviewButton';
import ForkProjectButton from '@/components/editor/ForkProjectButton';
import CommandPalette from '@/components/editor/CommandPalette';
import { InstantDemo } from '@/components/editor/InstantDemo';
import { SuccessCelebration } from '@/components/editor/SuccessCelebration';
import { LiveActivityFeed } from '@/components/editor/LiveActivityFeed';
import { useSocket } from '@/hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Layout, Zap, Bot, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';


function EditorContent() {
  const searchParams = useSearchParams();
  const prompt = searchParams.get('prompt');
  const auto = searchParams.get('auto');
  const [showOnboarding, setShowOnboarding] = useState(auto === 'true');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const {
    status,
    previewUrl,
    buildId,
    setStatus,
    setBuildId,
  } = useProjectStore();

  const [buildStartTime, setBuildStartTime] = useState<number | null>(null);
  const [buildDuration, setBuildDuration] = useState<number | null>(null);
  const [showTrustTransition, setShowTrustTransition] = useState(false);

  // 🔥 Initialize Socket (Replaces Polling)
  useSocket(buildId);

  // ⏱️ Track build duration
  useEffect(() => {
    if (status === 'complete' && buildStartTime) {
      const duration = Math.floor((Date.now() - buildStartTime) / 1000);
      setBuildDuration(duration);
    }
  }, [status, buildStartTime]);

  useEffect(() => {
    if (previewUrl) {
      setShowTrustTransition(true);
      const timer = setTimeout(() => setShowTrustTransition(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [previewUrl]);
  const startBuild = async (buildPrompt: string) => {
    try {
      setBuildStartTime(Date.now());
      setStatus('planning');
      const res = await fetch('/api/orchestrator/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrompt }),
      });
      const data = await res.json();
      if (data.buildId) {
        setBuildId(data.buildId);
      } else {
        throw new Error('No buildId returned from mission control.');
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[Editor] Start build failed:', error.message);
      setStatus('error');
    }
  };

  const handleRetry = () => {
    if (prompt) startBuild(prompt);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    if (prompt) startBuild(prompt);
  };

  // Keyboard and Global Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (showOnboarding) {
    return <ValueFirstBuild onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0B] text-white overflow-hidden selection:bg-primary/30">
      <AnimatePresence>
        {status === 'error' && (
          <BuildErrorPanel 
            error={{ message: "The agent swarm encountered a structural anomaly during code synthesis." }}
            onRetry={handleRetry}
            onEdit={() => window.location.href = '/'}
            onAdvanced={() => setStatus('idle')}
          />
        )}
      </AnimatePresence>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />

      {status === 'complete' && (
        <SuccessCelebration 
            previewUrl={previewUrl} 
            projectName={prompt || undefined} 
            duration={buildDuration || undefined}
        />
      )}

      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 z-20 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.location.href = '/'}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black italic shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform text-white">MA</div>
            <span className="font-bold tracking-tighter text-lg hidden md:block">MultiAgent <span className="text-gray-500 font-medium">IDE</span></span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden md:block" />
          <div className="flex items-center gap-3 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
             <Bot size={14} className="text-primary" />
             <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate max-w-[200px] md:max-w-md">
                {prompt || 'Scratchpad Mission'}
             </span>
          </div>
          <div className="hidden lg:flex items-center gap-2 group cursor-help">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500/80 group-hover:text-orange-500 transition-colors">
                🔥 1,245 apps built today
              </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SharePreviewButton previewUrl={previewUrl} />
          <ForkProjectButton projectId={buildId} />
          <div className="h-4 w-px bg-white/10 mx-2" />
          <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all">
            <Settings size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative flex flex-col">
           <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
              <AnimatePresence>
                {status !== 'idle' && status !== 'complete' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Mission Underway</span>
                  </motion.div>
                )}
                {showTrustTransition && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-3 px-5 py-2.5 bg-emerald-500/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl shadow-emerald-500/20"
                  >
                    <Zap size={16} className="text-white fill-current" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white/70 leading-none">Verified Launch</span>
                        <span className="text-xs font-bold text-white">This is your unique build</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>

           <div className="absolute bottom-10 left-6 z-10 hidden md:block">
              {status !== 'idle' && status !== 'complete' && <LiveActivityFeed />}
           </div>
            <div className="flex-1 w-full bg-white relative rounded-t-[2.5rem] overflow-hidden shadow-2xl border-t border-white/5">
              {previewUrl ? (
                <PreviewPanel 
                  url={previewUrl} 
                  prompt={prompt || undefined}
                />
              ) : (status !== 'idle' && status !== 'error' && status !== 'complete') ? (
                <InstantDemo />
              ) : (
                <PreviewPanel 
                  url={null} 
                  prompt={prompt || undefined}
                />
              )}
            </div>
         </div>

         <aside className="hidden lg:flex w-80 border-l border-white/5 bg-[#0A0A0B] flex-col p-6 space-y-8">
            <div className="space-y-4">
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <Zap size={14} className="text-primary" />
                  Deployment Health
               </div>
               <div className="space-y-3">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                     <div className="flex justify-between text-[10px] font-bold text-gray-400">
                        <span>CPU USAGE</span>
                        <span className="text-white">0.2%</span>
                     </div>
                     <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[12%]" />
                     </div>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                     <div className="flex justify-between text-[10px] font-bold text-gray-400">
                        <span>MEMORY</span>
                        <span className="text-white">124MB</span>
                     </div>
                     <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[45%]" />
                     </div>
                  </div>
               </div>
            </div>
          
           <div className="pt-8 border-t border-white/5 space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                 <Layout size={14} className="text-purple-500" />
                 Active Agents
              </div>
              <div className="flex -space-x-2">
                 {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0A0A0B] bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center font-black text-[10px] shadow-lg">A{i}</div>
                 ))}
                 <div className="w-8 h-8 rounded-full border-2 border-[#0A0A0B] bg-white/5 flex items-center justify-center font-black text-[10px] text-gray-500">+1</div>
              </div>
           </div>
        </aside>
      </main>

      <footer className="h-24 bg-black/60 backdrop-blur-xl border-t border-white/5 px-8 flex items-center relative overflow-hidden">
        <AnimatePresence>
          {status !== 'idle' && status !== 'complete' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.05 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary pointer-events-none blur-[100px]"
            />
          )}
        </AnimatePresence>

        <div className="w-full max-w-6xl mx-auto flex items-center gap-12 relative z-10">
           <div className="hidden md:flex flex-col gap-1 min-w-[200px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Node Status</span>
              <p className="text-xs text-emerald-500 font-bold uppercase">Ready & Secure</p>
           </div>
           
           <div className="flex-1">
              <BuildStatusTimeline current={status} />
           </div>

           <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Mission</p>
                 <p className="text-xs text-white/40 font-bold uppercase truncate max-w-[120px]">{prompt || 'Scratchpad'}</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                 <Rocket size={20} />
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={
       <div className="h-screen bg-black flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
       </div>
    }>
      <EditorContent />
    </Suspense>
  );
}
