'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, Sparkles, CheckCircle2, ArrowRight, Play, Layout, Cpu, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const [prompt, setPrompt] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [mode, setMode] = useState<'prompt' | 'guided'>('prompt');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [demoStep, setDemoStep] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const router = useRouter();

  const examples = [
    "Build a SaaS dashboard with real-time charts",
    "Create a minimalist portfolio for a designer",
    "Generate a landing page for an AI fitness app",
    "Build a project management tool with Kanban"
  ];

  // Rotate examples
  useEffect(() => {
    const interval = setInterval(() => {
      setExampleIndex((prev: number) => (prev + 1) % examples.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [examples.length]);

  // Demo flow simulation
  useEffect(() => {
    if (!isLaunching) {
       const interval = setInterval(() => {
         setDemoStep((prev: number) => (prev + 1) % 5);
       }, 5000);
       return () => clearInterval(interval);
    }
  }, [isLaunching]);

  const handleStart = () => {
    if (!prompt && mode === 'prompt') return;
    setIsLaunching(true);
    setLoadingMessage('⚡ Switching to real build...');
    
    const targetPrompt = prompt || examples[exampleIndex];
    
    // Stage 1: Transition Trust
    setTimeout(() => {
      setLoadingMessage('🚀 Building your actual app...');
    }, 4000);

    // Redirect after slightly longer to show the messages
    setTimeout(() => {
      router.push(`/projects/new?prompt=${encodeURIComponent(targetPrompt)}&mode=${mode}`);
    }, 7000);
  };

  const steps = [
    { title: "Describe", desc: "Type your vision in plain English.", icon: <Sparkles className="w-5 h-5" /> },
    { title: "Watch", desc: "Our agents build it live in < 60s.", icon: <Play className="w-5 h-5" /> },
    { title: "Edit", desc: "Refine every detail with AI chat.", icon: <Layout className="w-5 h-5" /> },
    { title: "Deploy", desc: "Launch to a global edge network.", icon: <Globe className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen bg-[#060607] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5 backdrop-blur-sm bg-black/5">
        <div className="text-xl font-bold tracking-tight flex items-center gap-2.5 group cursor-pointer">
          <div className="w-9 h-9 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">MultiAgent</span>
        </div>
        <div className="hidden md:flex gap-10 text-sm font-medium text-gray-400">
          <a href="#" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">Showcase</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-5 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors">
            Sign In
          </button>
          <button onClick={handleStart} className="px-5 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-gray-200 transition-all active:scale-95">
            Get Started
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          
          <div className="space-y-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] font-bold text-purple-400 tracking-wider uppercase"
            >
              <div className="relative flex h-2 w-2">
                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></div>
                <div className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></div>
              </div>
              New: v1.4 Intelligent Orchestration
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight"
            >
              Build your next <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400">
                big idea in seconds.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-400 max-w-lg leading-relaxed"
            >
              The first AI application builder that actually writes, tests, and deploys production-grade code. No templates, just pure innovation.
            </motion.p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-[13px] font-bold text-gray-500">
                <div className="flex p-1 bg-white/5 border border-white/10 rounded-full">
                  <button 
                    onClick={() => setMode('prompt')}
                    className={`px-5 py-2 rounded-full transition-all ${mode === 'prompt' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-gray-300'}`}
                  >
                    Prompt Mode
                  </button>
                  <button 
                    onClick={() => setMode('guided')}
                    className={`px-5 py-2 rounded-full transition-all ${mode === 'guided' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-gray-300'}`}
                  >
                    Guided Mode ✨
                  </button>
                </div>
              </div>

              <div className="relative group max-w-xl">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl blur-md opacity-20 group-focus-within:opacity-50 transition duration-1000 group-hover:opacity-30"></div>
                <div className="relative bg-[#0d0d0f] border border-white/10 rounded-2xl p-2.5 flex items-center shadow-[0_0_50px_-12px_rgba(168,85,247,0.2)]">
                  <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`E.g. "${examples[exampleIndex]}"`}
                    className="flex-1 bg-transparent px-4 py-3 outline-none text-white placeholder:text-gray-600 font-medium"
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  />
                  <button 
                    onClick={handleStart}
                    className="px-7 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-white/5"
                  >
                    {isLaunching ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <Rocket className="w-4 h-4 fill-black" />
                    )}
                    {isLaunching ? 'Initializing...' : 'Build My App'}
                  </button>
                </div>
                {isLaunching && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs font-bold text-purple-400 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    {loadingMessage}
                  </motion.div>
                )}
                <div className="mt-4 flex items-center justify-between px-2">
                   <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600 uppercase tracking-widest">
                     <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" />
                     No signup required • Live in 60s
                   </div>
                   <div className="text-[10px] text-gray-700 font-bold uppercase tracking-wider">
                     Press Enter ↵
                   </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div className="flex -space-x-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-9 h-9 rounded-full border-[3px] border-[#060607] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-[10px] font-black text-gray-500 ring-1 ring-white/5">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="h-8 w-px bg-white/5" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-bold">1,200+ Apps Built</span>
                <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">In the last 24 hours</span>
              </div>
            </div>
          </div>

          {/* Improved Hybrid Demo Flow */}
          <div className="relative group lg:block hidden">
            <div className="absolute -inset-10 bg-purple-500/10 blur-[120px] rounded-full group-hover:bg-purple-500/15 transition-colors"></div>
            
            <div className="relative bg-[#0d0d0f] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden aspect-[4/3] flex flex-col">
              {/* Fake Browser Header */}
              <div className="bg-[#141417] px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <div className="bg-white/5 px-4 py-1 rounded-full text-[10px] text-gray-500 font-mono">
                  multiagent.app/preview/temp-9821
                </div>
                <div className="w-12" />
              </div>
              
              <div className="flex-1 p-8 font-mono text-xs relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {demoStep === 0 && (
                    <motion.div 
                      key="step0"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-3 text-purple-400">
                        <span className="text-lg">▹</span>
                        <span className="font-bold">Planning Architecture...</span>
                      </div>
                      <div className="pl-6 space-y-2 text-gray-500">
                        <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500/50" /> Analyzing requirements</p>
                        <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-700" /> Mapping dependency graph</p>
                        <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-700" /> Selecting tech stack</p>
                      </div>
                    </motion.div>
                  )}
                  {demoStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-3 text-blue-400">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span className="font-bold">Generating Components...</span>
                      </div>
                      <div className="pl-6 space-y-2 text-gray-500">
                        <p className="flex items-center gap-2 text-green-500/70"><CheckCircle2 className="w-3 h-3" /> Navigation.tsx created</p>
                        <p className="flex items-center gap-2 text-blue-500/70"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Building HeroSection.tsx...</p>
                        <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-700" /> Dashboard.tsx pending</p>
                      </div>
                    </motion.div>
                  )}
                  {demoStep >= 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-x-8 bottom-8 top-12 rounded-2xl overflow-hidden border border-white/10 shadow-3xl bg-[#060607]"
                    >
                      {/* Fake App Preview */}
                      <div className="w-full h-full flex flex-col">
                        <div className="h-12 border-b border-white/5 flex items-center justify-between px-4">
                          <div className="w-20 h-3 bg-white/5 rounded-full" />
                          <div className="flex gap-2">
                             <div className="w-8 h-8 rounded-full bg-white/5" />
                             <div className="w-16 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30" />
                          </div>
                        </div>
                        <div className="flex-1 p-6 space-y-6">
                           <div className="space-y-2">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 1 }}
                                className="h-6 bg-gradient-to-r from-purple-500/20 to-transparent rounded-lg" 
                              />
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "60%" }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className="h-3 bg-white/5 rounded-full" 
                              />
                           </div>
                           <div className="grid grid-cols-3 gap-4">
                              {[1,2,3].map(i => (
                                <motion.div 
                                  key={i}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.5 + (i * 0.1) }}
                                  className="aspect-square bg-white/5 rounded-xl border border-white/5" 
                                />
                              ))}
                           </div>
                        </div>
                        {demoStep === 4 && (
                           <motion.div 
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6"
                           >
                             <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/20">
                               <CheckCircle2 className="w-6 h-6 text-black" />
                             </div>
                             <h3 className="text-xl font-bold mb-2">App is Ready!</h3>
                             <p className="text-sm text-gray-400 mb-6">Generated in 42 seconds with 4 specialized agents.</p>
                             <div className="flex gap-3">
                               <button className="px-5 py-2 bg-white text-black rounded-lg text-xs font-bold">Open App</button>
                               <button className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">Edit Code</button>
                             </div>
                           </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status Bar */}
              <div className="bg-[#141417] px-6 py-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-4 items-center">
                  <span className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    System Live
                  </span>
                  <div className="h-3 w-px bg-white/10" />
                  <span className="text-[10px] text-gray-400 font-mono">Build v2.1.0-alpha</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-[10px]">
                   <span>Latency: 12ms</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* How it works section */}
        <section className="py-32 border-t border-white/5 mt-20">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">How it works</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">From concept to production in four simple steps.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="group relative p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {React.cloneElement(step.icon as React.ReactElement, { className: "w-6 h-6 text-purple-400" })}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                <div className="absolute top-8 right-8 text-4xl font-black text-white/5 select-none">{i + 1}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action Bottom */}
        <section className="py-24 mb-32 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-[100px] rounded-full opacity-30"></div>
          <div className="relative bg-[#0d0d0f] border border-white/10 rounded-[3rem] p-16 text-center space-y-8 overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500"></div>
             <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Ready to build the future?</h2>
             <p className="text-gray-400 text-lg max-w-xl mx-auto">Join thousands of developers and teams building real apps at the speed of thought.</p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
               <button onClick={handleStart} className="px-8 py-4 bg-white text-black rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center gap-2 group">
                 🚀 Start Building Now
                 <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
               </button>
               <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">
                 View Showcase
               </button>
             </div>
             <p className="text-gray-600 text-sm font-medium">No credit card required. Free 7-day trial of Pro features.</p>
          </div>
        </section>

      </main>

      {/* Viral Loop Footer */}
      <footer className="border-t border-white/5 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
               <Cpu className="w-4 h-4 text-gray-400" />
             </div>
             <span className="text-gray-500 text-sm font-medium">© 2026 MultiAgent AI. All rights reserved.</span>
          </div>
          
          <div className="flex items-center gap-8">
             <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Privacy</a>
             <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Terms</a>
             <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Twitter</a>
             <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">GitHub</a>
          </div>

          <div className="group cursor-pointer">
            <a 
              href="/landing" 
              className="px-4 py-2 bg-gradient-to-r from-purple-600/10 to-blue-500/10 border border-white/5 rounded-full flex items-center gap-2 transition-all hover:border-purple-500/30 shadow-lg shadow-black/20"
            >
              <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Built with MultiAgent ⚡</span>
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">Build yours in 60s</span>
              <ArrowRight className="w-3 h-3 text-purple-400 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
