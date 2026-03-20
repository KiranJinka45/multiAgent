'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';

const EVENTS = [
  "⚡ User842 just deployed a SaaS Landing Page",
  "✨ Someone remixed 'Todo App' via Twitter",
  "🔥 Mission 'Crypto Dashboard' is trending",
  "🚀 New mission started: 'E-commerce UI'",
  "✨ User129 just saved 14 hours of coding",
  "⚡ Global swarm is active: 4,200 agent tasks today"
];

export const LiveActivityFeed: React.FC = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % EVENTS.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full w-fit">
                <Users size={12} className="text-emerald-500" />
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">
                    <span className="text-emerald-500">18 Builders</span> Active Now
                </span>
            </div>

            <div className="relative h-12 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-3 p-3 bg-neutral-900/50 border border-white/5 rounded-2xl backdrop-blur-md"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        <span className="text-[11px] font-bold text-gray-400 leading-none">
                            {EVENTS[index]}
                        </span>
                    </motion.div>
                </AnimatePresence>
            </div>
            
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 pt-1 pl-1">
                Global Network Activity
            </div>
        </div>
    );
};
