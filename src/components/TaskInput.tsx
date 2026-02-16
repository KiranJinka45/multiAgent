'use client';

import { Plus, Sparkles, Mic, Send, ChevronDown } from 'lucide-react';
import { useState } from 'react';

type TaskInputProps = {
    onAddTask: (title: string) => void;
};

export default function TaskInput({ onAddTask }: TaskInputProps) {
    const [title, setTitle] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onAddTask(title);
            setTitle('');
        }
    };

    return (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 p-6 pb-8 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent z-40">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative w-full px-6">
                <div className="relative flex items-center bg-[#1e1e1e] border border-white/10 rounded-[2rem] p-2 pr-4 shadow-2xl transition-all duration-300 focus-within:bg-[#2a2a2a] focus-within:border-white/20">

                    {/* Left Actions */}
                    <button
                        type="button"
                        className="p-3 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <Plus size={20} />
                    </button>

                    {/* Input Field */}
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ask AntiGravity"
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-neutral-500 text-lg px-2"
                        autoFocus
                    />

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        {/* Tools / Features */}
                        {!title && (
                            <button
                                type="button"
                                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors text-sm font-medium"
                            >
                                <Sparkles size={16} />
                                <span>Tools</span>
                            </button>
                        )}

                        {/* Pro Selector (Visual only) */}
                        <button
                            type="button"
                            className="hidden sm:flex items-center gap-1 pl-3 pr-2 py-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors text-sm font-medium"
                        >
                            <span>Pro</span>
                            <ChevronDown size={14} />
                        </button>

                        <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

                        {/* Submit / Mic */}
                        {title.trim() ? (
                            <button
                                type="submit"
                                className="p-2.5 bg-white text-black rounded-full hover:bg-neutral-200 transition-colors active:scale-95"
                            >
                                <Send size={20} className="ml-0.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="p-3 text-white bg-[#2a2a2a] hover:bg-[#333] rounded-full transition-colors"
                            >
                                <Mic size={20} />
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-center text-xs text-neutral-500 mt-3 font-medium">
                    AntiGravity can make mistakes. Check important info.
                </p>
            </form>
        </div>
    );
}
