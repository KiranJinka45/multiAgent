import { Sparkles, ArrowRight, Github } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12">
            <div className="space-y-4">
                <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-$\{process.env.THEME_PRIMARY\} to-emerald-400 bg-clip-text text-transparent italic">
                    Stress Corp 1 Dashboard
                </h1>
                <p className="text-xl text-$\{process.env.THEME_TEXT\} max-w-2xl mx-auto font-medium">
                    A modern dashboard for Stress Corp 1. Configure settings and start exploring.
                </p>
            </div>

            <div className="flex items-center gap-6">
                <button className="px-8 py-3 bg-$\{process.env.THEME_PRIMARY\} hover:bg-$\{process.env.THEME_PRIMARY}/700 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-$\{process.env.THEME_PRIMARY}/40">
                    Get Started
                    <ArrowRight size={20} />
                </button>
                <button className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-full font-bold flex items-center gap-2 transition-all border border-slate-700">
                    <Github size={20} />
                    Github
                </button>
            </div>

            <div className="grid grid-cols-3 gap-8 w-full max-w-5xl mt-24">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-$\{process.env.THEME_PRIMARY}/50 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-$\{process.env.THEME_PRIMARY}/10 flex items-center justify-center text-$\{process.env.THEME_PRIMARY} mb-6 group-hover:bg-$\{process.env.THEME_PRIMARY} group-hover:text-white transition-all">
                            <Sparkles size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 italic uppercase tracking-tight">Setting {i}</h3>
                        <p className="text-$\{process.env.THEME_TEXT\} text-sm leading-relaxed">Configure setting {i} here.</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
