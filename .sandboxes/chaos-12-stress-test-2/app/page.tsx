import { Sparkles, ArrowRight, Github } from 'lucide-react';
import { motion } from 'framer-motion';

const PROJECT_NAME = "Stress Corp 2";
const PROJECT_DESCRIPTION = "Stress Management Dashboard for stress corp users";

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12">
            <div className="space-y-4">
                <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-#3b82f6 to-blue-400 bg-clip-text text-transparent italic">
                    {PROJECT_NAME}
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
                    {PROJECT_DESCRIPTION}
                </p>
            </div>

            <div className="flex items-center gap-6">
                <button className="px-8 py-3 bg-#3b82f6 hover:bg-#4682b4 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/40">
                    Get Started
                    <ArrowRight size={20} />
                </button>
                <button className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-full font-bold flex items-center gap-2 transition-all border border-slate-700">
                    <Github size={20} />
                    Github
                </button>
            </div>

            <div className="grid grid-cols-3 gap-8 w-full max-w-5xl mt-24">
                <div className="flex flex-col items-center gap-4 justify-center">
                    <h2 className="text-4xl font-bold mb-2 italic uppercase tracking-tight text-#3b82f6">Stress Tracker</h2>
                </div>
                <div className="flex flex-col items-center gap-4 justify-center">
                    <h2 className="text-4xl font-bold mb-2 italic uppercase tracking-tight text-#3b82f6">Mood Monitor</h2>
                </div>
                <div className="flex flex-col items-center gap-4 justify-center">
                    <h2 className="text-4xl font-bold mb-2 italic uppercase tracking-tight text-#3b82f6">Goal Setting</h2>
                </div>
            </div>

        </div>
    );
}
