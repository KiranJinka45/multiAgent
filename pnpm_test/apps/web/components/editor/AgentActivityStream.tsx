'use client';

import { Sparkles, Bot, MessageSquare, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Activity {
  agent: string;
  action: string;
  timestamp: string;
  status: 'running' | 'done';
}

export default function AgentActivityStream({ activities = [] }: { activities?: Activity[] }) {
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 h-full overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Sparkles size={14} className="text-primary animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Agent Brain Activity</span>
      </div>
      
      <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
        <AnimatePresence>
          {(activities.length > 0 ? activities : [
            { agent: 'Planner', action: 'Analyzing prompt and designing architecture...', status: 'running', timestamp: new Date().toISOString() },
            { agent: 'Executor', action: 'Awaiting deployment target...', status: 'running', timestamp: new Date().toISOString() }
          ]).map((act, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 items-start"
            >
              <div className="p-1.5 bg-black/40 rounded-lg border border-white/5 mt-0.5">
                {act.agent === 'Planner' ? <Bot size={12} className="text-purple-400" /> : <Terminal size={12} className="text-blue-400" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{act.agent}</div>
                   {act.status === 'running' && <div className="w-1 h-1 bg-primary rounded-full animate-ping" />}
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">{act.action}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
