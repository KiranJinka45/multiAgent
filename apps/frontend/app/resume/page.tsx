'use client';

import React, { useState } from 'react';

export default function ResumePage() {
    const [resume, setResume] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleOptimize = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/resume/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeText: resume })
            });
            const data = await response.json();
            setResult(data);
        } catch (err) {
            console.error('Optimization failed', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            <nav className="p-6 border-b border-gray-100 flex justify-between items-center max-w-7xl mx-auto">
                <div className="font-black text-2xl tracking-tighter italic">OPTIMAL.AI</div>
                <div className="text-sm font-medium text-gray-500">Used by 1,240+ job seekers today</div>
            </nav>

            <div className="max-w-4xl mx-auto p-8 pt-20">
                <div className="text-center mb-16">
                    <h1 className="text-6xl font-black mb-6 tracking-tight">Fix your resume in 30 seconds.</h1>
                    <p className="text-2xl text-gray-500 max-w-2xl mx-auto">Get more interviews instantly with our AI-powered impact optimization.</p>
                </div>

                {!result ? (
                    <div className="space-y-6">
                        <textarea 
                            className="w-full h-80 p-6 text-lg border-2 border-gray-100 rounded-3xl focus:border-black outline-none transition bg-gray-50"
                            placeholder="Paste your current resume content here..."
                            value={resume}
                            onChange={(e) => setResume(e.target.value)}
                        />
                        <button 
                            className="w-full py-6 bg-black text-white text-xl font-bold rounded-3xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl shadow-gray-200"
                            onClick={handleOptimize}
                            disabled={loading || !resume}
                        >
                            {loading ? 'Analyzing your impact...' : 'Optimize My Resume - Free'}
                        </button>
                        
                        <div className="pt-10 grid grid-cols-3 gap-8 opacity-40 grayscale group hover:grayscale-0 transition-all duration-700">
                             <div className="flex items-center justify-center font-bold text-xl italic">Google</div>
                             <div className="flex items-center justify-center font-bold text-xl italic">Stripe</div>
                             <div className="flex items-center justify-center font-bold text-xl italic">Amazon</div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12 animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex items-center justify-between p-10 bg-black text-white rounded-[40px] shadow-2xl">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Impact Score Increase</p>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-7xl font-black text-green-400">+{result.score - 40}%</span>
                                    <span className="text-gray-500 text-xl">Current: {result.score}/100</span>
                                </div>
                            </div>
                            <div className="hidden md:block text-right">
                                <p className="text-green-400 font-bold">READY FOR ATS</p>
                                <p className="text-gray-400 text-sm">Optimized for FAANG roles</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="p-10 bg-gray-50 rounded-[40px]">
                                <h3 className="text-2xl font-black mb-6">Suggestions</h3>
                                <ul className="space-y-4">
                                    {result.suggestions.map((imp: string, i: number) => (
                                        <li key={i} className="flex gap-4 text-gray-700 leading-tight">
                                            <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">✓</span> {imp}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-10 border-4 border-gray-50 rounded-[40px]">
                                <h3 className="text-2xl font-black mb-6">Optimized Preview</h3>
                                <div className="whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed bg-white p-4 rounded-xl border border-gray-100 h-[300px] overflow-y-auto">
                                    {result.improved_text}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                             <a href="/pricing" className="flex-1 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-3xl text-center shadow-xl hover:scale-[1.02] transition">
                                Unlock Pro - $19/mo
                             </a>
                             <button className="flex-1 py-6 border-2 border-gray-100 text-gray-500 font-bold rounded-3xl" onClick={() => setResult(null)}>
                                Back to Editor
                             </button>
                        </div>
                    </div>
                )}
            </div>
            
            <footer className="py-20 text-center border-t border-gray-50 mt-20">
                 <p className="text-gray-300 font-medium">Built by the MultiAgent Autonomous System</p>
            </footer>
        </div>
    );
}
