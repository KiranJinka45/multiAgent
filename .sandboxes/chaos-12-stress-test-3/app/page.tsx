import { ArrowRight, Github } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12">
            <div className="space-y-4">
                <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-${process.env.THEME_PRIMARY_COLOR} to-${process.env.THEME_PRIMARY_COLOR} bg-clip-text text-transparent italic">
                    Stress Corp 3 Dashboard
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
                    A cutting-edge web app for stress analysis and management.
                </p>
            </div>

            <div className="flex items-center gap-6">
                <button className="px-8 py-3 bg-${process.env.THEME_PRIMARY_COLOR} hover:bg-${process.env.THEME_PRIMARY_COLOR_DARK} rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-${process.env.THEME PRIMARY_COLOR}">
                    Get Started
                    <ArrowRight size={20} />
                </button>
                <button className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-full font-bold flex items-center gap-2 transition-all border border-slate-700">
                    <Github size={20} />
                    Github
                </button>
            </div>

            <div className="grid grid-cols-3 gap-8 w-full max-w-5xl mt-24">
                <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-${process.env.THEME_PRIMARY_COLOR_DARK}/50 transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-${process.env.THEME_PRIMARY_COLOR}/10 flex items-center justify-center text-${process.env.THEME_PRIMARY_COLOR} mb-6 group-hover:bg-${process.env.THEME_PRIMARY_COLOR} group-hover:text-white transition-all">
                        <p className="text-xl font-bold mb-2 italic uppercase tracking-tight">Dashboard</p>
                    </div>
                </div>
                <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-${process.env.THEME_PRIMARY_COLOR_DARK}/50 transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-${process.env.THEME_PRIMARY_COLOR}/10 flex items-center justify-center text-${process.env.THEME_PRIMARY_COLOR} mb-6 group-hover:bg-${process.env.THEME_PRIMARY_COLOR} group-hover:text-white transition-all">
                        <p className="text-xl font-bold mb-2 italic uppercase tracking-tight">Settings</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
