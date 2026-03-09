import { Sparkles, ArrowRight, Github } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12">
            <div className="space-y-4">
                <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-${process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR}/500 to-${process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR}/700 bg-clip-text text-transparent italic">
                    Stress Corp 4
                </h1>
                <p className="text-xl text-${process.env.NEXT_PUBLIC_BRAND_TEXT_COLOR} max-w-2xl mx-auto font-medium">
                    A comprehensive dashboard for Stress Corp 4
                </p>
            </div>

            <div className="flex items-center gap-6">
                <button className="px-8 py-3 bg-${process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR} hover:bg-${process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR}/500 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-${process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR}/10">
                    Get Started
                    <ArrowRight size={20} />
                </button>
                <button className="px-8 py-3 bg-${process.env.NEXT_PUBLIC_BRAND_TEXT_COLOR} hover:bg-${process.env.NEXT_PUBLIC_BRAND_TEXT_COLOR}/50 rounded-full font-bold flex items-center gap-2 transition-all border border-${process.env.NEXT_PUBLIC_BRAND_TEXT_COLOR}">
                    <Github size={20} />
                    Github
                </button>
            </div>

            <div className="grid grid-cols-3 gap-8 w-full max-w-5xl mt-24">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-8 rounded-3xl bg-${process.env.NEXT_PUBLIC_BRAND_TEXT_COLOR}/50 border border-${process.env.NEXT_PUBLIC_BRAND_TEXT_COLOR} hover:border-${process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR}/50 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-${process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR}/10 flex items-center justify-center text-${process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR} mb-6 group-hover:bg-${process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR} group-hover:text-white transition-all">
                            <Sparkles size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 italic uppercase tracking-tight">Feature {i}</h3>
                        <p className="text-${process.env.NEXT_PUBLIC_BRAND_TEXT_COLOR} text-sm leading-relaxed">
                            This is feature {i}.
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}