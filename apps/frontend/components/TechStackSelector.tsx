import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layers, LayoutTemplate, Server, Database, Sparkles,
    CheckCircle2, Rocket
} from 'lucide-react';

export type TechStack = {
    frontend: string;
    styling: string;
    backend: string;
    database: string;
};

interface TechStackSelectorProps {
    prompt: string;
    onStartBuild: (stack: TechStack) => void;
    isGenerating?: boolean;
}

const OPTIONS = {
    frontend: [
        { id: 'nextjs', name: 'Next.js App Router', desc: 'React framework for production', recommendedFor: ['seo', 'ecommerce', 'fullstack', 'default'] },
        { id: 'react', name: 'React (Vite)', desc: 'Fast client-side SPA', recommendedFor: ['dashboard', 'admin', 'interactive'] },
        { id: 'angular', name: 'Angular', desc: 'Enterprise application framework', recommendedFor: ['enterprise', 'complex'] },
        { id: 'html', name: 'Static HTML/JS', desc: 'Vanilla web standard', recommendedFor: ['landing', 'simple', 'static'] },
    ],
    styling: [
        { id: 'tailwind', name: 'Tailwind CSS', desc: 'Performance-first utility classes', recommendedFor: ['modern', 'fast', 'custom', 'default'] },
        { id: 'shadcn', name: 'Shadcn UI', desc: 'Beautifully designed components', recommendedFor: ['ui', 'components'] },
        { id: 'framer', name: 'Framer Motion', desc: 'Production-ready animations', recommendedFor: ['animation', 'interactive'] },
    ],
    backend: [
        { id: 'api-routes', name: 'Next.js API Routes', desc: 'Serverless backend logic', recommendedFor: ['api', 'default'] },
        { id: 'auth', name: 'Authentication (Auth.js)', desc: 'Secure user management', recommendedFor: ['auth', 'users'] },
        { id: 'database', name: 'Database (Supabase)', desc: 'Postgres & Realtime data', recommendedFor: ['db', 'data'] },
    ],
    database: [
        { id: 'supabase', name: 'Supabase', desc: 'Instant Postgres with Auth', recommendedFor: ['realtime', 'auth', 'fast delivery', 'default'] },
        { id: 'none', name: 'None', desc: 'No persistent storage' },
        { id: 'postgres', name: 'PostgreSQL', desc: 'Relational data', recommendedFor: ['relational', 'complex queries', 'financial'] },
        { id: 'mongodb', name: 'MongoDB', desc: 'NoSQL document storage', recommendedFor: ['dynamic schemas', 'nosql', 'fast iteration'] },
    ],
};

const STEPS = [
    { id: 'frontend', title: 'Frontend Engine', icon: LayoutTemplate },
    { id: 'styling', title: 'Styling System', icon: Layers },
    { id: 'backend', title: 'Backend API', icon: Server },
    { id: 'database', title: 'Database Layer', icon: Database },
];

export default function TechStackSelector({ prompt, onStartBuild, isGenerating }: TechStackSelectorProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [selection, setSelection] = useState<TechStack>({
        frontend: '',
        styling: '',
        backend: '',
        database: ''
    });

    const currentStep = STEPS[currentStepIndex];

    // Simple Auto-Suggester based on prompt keywords
    const getRecommendation = (stepId: keyof TechStack) => {
        const p = prompt.toLowerCase();
        for (const opt of OPTIONS[stepId]) {
            if (opt.recommendedFor && opt.recommendedFor.some(kw => p.includes(kw))) {
                return opt.id;
            }
        }
        return OPTIONS[stepId][0].id; // Default fallback
    };

    // Auto-select on mount
    useEffect(() => {
        const getRecommendationForEffect = (stepId: keyof TechStack) => {
            const p = prompt.toLowerCase();
            for (const opt of OPTIONS[stepId]) {
                if (opt.recommendedFor && opt.recommendedFor.some(kw => p.includes(kw))) {
                    return opt.id;
                }
            }
            return OPTIONS[stepId][0].id; // Default fallback
        };

        setSelection({
            frontend: getRecommendationForEffect('frontend'),
            styling: getRecommendationForEffect('styling'),
            backend: getRecommendationForEffect('backend'),
            database: getRecommendationForEffect('database')
        });
    }, [prompt]);

    const handleSelect = (val: string) => {
        if (!currentStep) return;
        setSelection(s => ({ ...s, [currentStep.id]: val }));
        setCurrentStepIndex(i => Math.min(i + 1, STEPS.length - 1));
    };

    const isComplete = currentStepIndex === STEPS.length - 1 && selection.database !== '';

    if (!currentStep) return null;

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <Sparkles size={20} className="text-white" />
                </div>
                <div>
                    <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-none mb-1">Architecture Wizard</div>
                    <div className="text-xl font-black text-white tracking-widest uppercase italic leading-none">Review & Configure</div>
                </div>
            </div>

            {/* Step Progress indicators */}
            <div className="flex gap-2 mb-8">
                {STEPS.map((step, idx) => (
                    <button
                        key={step.id}
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${idx === currentStepIndex
                            ? 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                            : idx < currentStepIndex ? 'bg-white/20' : 'bg-white/5'
                            }`}
                    />
                ))}
            </div>

            {/* Selection Area */}
            <div className="flex-1 relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <currentStep.icon size={20} className="text-primary" />
                            <h3 className="text-lg font-bold text-white tracking-wide">{currentStep.title}</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {OPTIONS[currentStep.id as keyof TechStack].map(opt => {
                                const isSelected = selection[currentStep.id as keyof TechStack] === opt.id;
                                const isRecommended = getRecommendation(currentStep.id as keyof TechStack) === opt.id;

                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleSelect(opt.id)}
                                        className={`relative text-left p-5 rounded-2xl border transition-all duration-200 overflow-hidden ${isSelected
                                            ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-primary/50'
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-gray-200'}`}>
                                                {opt.name}
                                            </span>
                                            {isSelected && <CheckCircle2 size={16} className="text-primary" />}
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                            {opt.desc}
                                        </p>
                                        {isRecommended && (
                                            <div className="absolute top-0 right-0 px-2 py-0.5 bg-primary/20 text-primary text-[9px] font-bold tracking-widest uppercase rounded-bl-lg">
                                                Recommended
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Final Action */}
            <AnimatePresence>
                {isComplete && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 pt-8 border-t border-white/5 flex justify-end"
                    >
                        <button
                            onClick={() => onStartBuild(selection)}
                            disabled={isGenerating}
                            className="group flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:bg-blue-500 transition-all shadow-[0_15px_30px_-10px_rgba(59,130,246,0.6)] active:scale-95 disabled:opacity-50"
                        >
                            {isGenerating ? <Sparkles size={16} className="animate-pulse" /> : <Rocket size={16} className="group-hover:translate-x-1 transition-transform" />}
                            Execute Build Sequence
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
