'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, GitFork, ArrowRight, Eye, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ExplorePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/public-showcase')
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Premium Navigation Header */}
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push('/')}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black italic shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform text-white">MA</div>
            <span className="font-black tracking-tighter text-xl">MultiAgent <span className="text-gray-500 font-medium">Explore</span></span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 w-96 group focus-within:border-primary/50 transition-all">
          <Search size={16} className="text-gray-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search community builds..." 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-600"
          />
        </div>

        <div className="flex items-center gap-4">
             <button 
                onClick={() => router.push('/')}
                className="px-5 py-2.5 bg-primary text-white text-sm font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.05] active:scale-[0.95] transition-all"
             >
                ✨ Build My Own
             </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex flex-col gap-4 mb-12">
            <h1 className="text-5xl font-black tracking-tighter">
                Community Showroom<span className="text-primary">.</span>
            </h1>
            <p className="text-xl text-gray-500 font-medium max-w-2xl leading-relaxed">
                Discover, remix, and learn from the most viral applications built with MultiAgent AI.
            </p>
            <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">1,245 builds today</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <UsersIcon size={12} className="text-gray-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">18 Active Builders</span>
                </div>
            </div>
        </div>

        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="aspect-video bg-white/5 rounded-[2rem] animate-pulse border border-white/5" />
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map((project, idx) => (
                    <motion.div 
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative bg-[#0D0D0E] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-primary/30 transition-all shadow-2xl hover:shadow-primary/5 cursor-pointer"
                        onClick={() => router.push(`/share/${project.id}`)}
                    >
                        {/* Project Preview */}
                        <div className="aspect-video bg-[#141416] relative overflow-hidden flex items-center justify-center border-b border-white/5">
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                             
                             {/* Placeholder Icon if no image */}
                             <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Zap size={32} />
                             </div>

                             {/* Hover CTA */}
                             <div className="absolute bottom-6 left-6 z-20 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all">
                                <span className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-black rounded-xl">
                                    View Live <ArrowRight size={14} />
                                </span>
                             </div>
                        </div>

                        {/* Project Info */}
                        <div className="p-7 space-y-4">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors truncate pr-4">
                                    {project.name || 'Untitled Build'}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
                                    <GitFork size={12} className="text-primary" />
                                    {Math.floor(Math.random() * 50) + 5}
                                </div>
                            </div>
                            
                            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                                {project.description || 'A unique autonomous build synthesizing agentic patterns and modern UI components.'}
                            </p>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-primary flex items-center justify-center font-black text-[10px]">
                                        {project.user_id?.slice(0, 2).toUpperCase() || 'MA'}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Member since 2026
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-600">
                                    <Eye size={12} />
                                    <span className="text-[10px] font-black">{Math.floor(Math.random() * 500) + 120}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        )}
      </main>
    </div>
  );
}

function UsersIcon({ size, className }: { size: number, className?: string }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}
