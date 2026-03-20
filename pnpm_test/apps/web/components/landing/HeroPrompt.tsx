'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const EXAMPLES = [
  "Build a todo app with drag and drop",
  "Create a personal blog with dark mode",
  "Make a real-time chat dashboard",
];

export default function HeroPrompt() {
  const [prompt, setPrompt] = useState("");
  const router = useRouter();

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (prompt.trim()) {
      router.push(`/editor?prompt=${encodeURIComponent(prompt)}&auto=true`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl w-full space-y-8"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
            <Sparkles size={12} />
            Autonomous AI App Builder
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-tight">
            Vision to Reality <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-emerald-500">
              In Seconds.
            </span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">
            Describe your application. Our swarm of specialized AI agents will plan, architect, and deploy it for you.
          </p>
        </div>

        <div className="relative group max-w-2xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition-all" />
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="relative flex items-center bg-[#1e1e1e] border border-white/10 rounded-2xl p-2 shadow-2xl"
          >
            <input 
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Build me a SaaS app with login and Stripe..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 text-white placeholder-gray-600 font-medium"
            />
            <button 
              type="submit"
              disabled={!prompt.trim()}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              Build Now
              <Rocket size={16} />
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setPrompt(ex); }}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 text-[10px] font-bold text-gray-400 hover:text-white transition-all"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Explore Featured Builds (Social Proof) */}
        <div className="pt-20 space-y-12">
            <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                    Community Showroom
                </span>
                <h2 className="text-3xl font-black text-white tracking-tight">
                    Explore Popular Build<span className="text-primary">s</span>
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {[
                    { name: 'SaaS Dashboard', views: '1.2k', remixes: 84, color: 'from-blue-500 to-indigo-600' },
                    { name: 'Real-time Chat', views: '840', remixes: 32, color: 'from-purple-500 to-pink-600' },
                    { name: 'Portfolio Studio', views: '2.1k', remixes: 156, color: 'from-emerald-500 to-teal-600' }
                ].map((build) => (
                    <div key={build.name} className="group relative">
                        <div className={`absolute -inset-0.5 bg-gradient-to-r ${build.color} opacity-10 blur group-hover:opacity-30 transition-all rounded-[2rem]`} />
                        <div className="relative bg-[#121214] border border-white/5 rounded-[2rem] p-6 hover:border-white/20 transition-all cursor-pointer">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${build.color} mb-6 flex items-center justify-center shadow-lg`}>
                                <Sparkles size={20} className="text-white fill-white/20" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{build.name}</h3>
                            <div className="flex items-center gap-4 text-gray-500 text-xs font-semibold">
                                <span className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                                    {build.views} views
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-primary" />
                                    {build.remixes} remixes
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest pt-4">
                Join 5,000+ builders creating the future.
            </p>
        </div>

        <div className="pt-12 flex items-center justify-center gap-8 text-gray-600 opacity-30 select-none">
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-crosshair">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <span className="text-[10px] font-black">REACT</span>
            </div>
          </div>
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-crosshair">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-[10px] font-black">NEXT.JS</span>
            </div>
          </div>
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-crosshair">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <span className="text-[10px] font-black">AI</span>
            </div>
          </div>
        </div>
        <div className="mt-12 text-center">
            <p className="text-xs text-gray-600 mb-3 uppercase tracking-widest font-black italic">Or get inspired by the community</p>
            <button 
                onClick={() => router.push('/explore')}
                className="group flex items-center gap-2 mx-auto px-6 py-2 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all shadow-lg active:scale-95"
            >
                <Zap size={14} className="text-primary group-hover:fill-primary transition-all duration-300" />
                <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Explore Builds</span>
                <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
            </button>
        </div>
      </motion.div>
    </div>
  );
}
