import { Sparkles, ArrowRight, Github } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12">
            <div className="space-y-4">
                <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent italic">
                    {{ PROJECT_NAME }}
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
                    {{ PROJECT_DESCRIPTION }}
                </p>
            </div>

            <div className="flex items-center gap-6">
                <button className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/40">
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
                    <div key={i} className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-500 group-hover:text-white transition-all">
                            <Sparkles size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 italic uppercase tracking-tight">Feature {i}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {{ FEATURE_DESCRIPTION }}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
