'use client';

import { useRouter } from 'next/navigation';
import HeroPrompt from '@/components/landing/HeroPrompt';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col font-sans selection:bg-primary/30 overflow-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <nav className="h-20 border-b border-white/5 flex items-center justify-between px-8 relative z-20 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black italic">MA</div>
          <span className="font-bold tracking-tighter text-xl text-white">MultiAgent</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
          <a href="/explore" className="hover:text-white transition-colors">Marketplace</a>
          <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
          <button onClick={() => router.push('/projects')} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white font-bold leading-none">Login</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center relative z-10 py-20">
        <HeroPrompt />
      </main>

      <footer className="h-20 border-t border-white/5 flex items-center justify-center text-gray-500 text-[10px] tracking-widest uppercase font-bold px-8 bg-black/20 mt-auto">
        Built with MultiAgent Orchestrator • © 2026
      </footer>
    </div>
  );
}
