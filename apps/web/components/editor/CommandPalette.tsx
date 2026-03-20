'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, Rocket, Settings, Layout, Zap, Terminal, Brain } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMANDS = [
  { id: 'new', icon: Rocket, label: 'New Mission', shortcut: 'N', action: (router: ReturnType<typeof useRouter>) => router.push('/') },
  { id: 'mode', icon: Layout, label: 'Switch to Advanced Mode', shortcut: 'M', action: () => console.log('Switch Mode') },
  { id: 'settings', icon: Settings, label: 'Open Project Settings', shortcut: 'S', action: () => console.log('Settings') },
  { id: 'debug', icon: Terminal, label: 'Open Debug Console', shortcut: 'D', action: () => console.log('Debug') },
  { id: 'agent', icon: Brain, label: 'Consult Chief Architect Agent', shortcut: 'A', action: () => console.log('Consult Agent') },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCommands = COMMANDS.filter(cmd => 
     cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             onClick={onClose}
             className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            className="w-full max-w-xl bg-[#18181B] border border-white/10 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden relative"
          >
            <div className="flex items-center px-4 py-3 border-b border-white/5 bg-white/5">
               <Search size={18} className="text-gray-500 mr-3" />
               <input 
                 autoFocus
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="Search commands or agents..."
                 className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder-gray-600 font-medium"
               />
               <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-md border border-white/5">
                  <Command size={10} className="text-gray-400" />
                  <span className="text-[10px] font-black text-white px-0.5">K</span>
               </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
               {filteredCommands.length > 0 ? (
                 <>
                   <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Quick Actions</div>
                   {filteredCommands.map((cmd) => (
                     <button
                       key={cmd.id}
                       onClick={() => { cmd.action(router); onClose(); }}
                       className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-primary/10 hover:text-white text-gray-400 transition-all group"
                     >
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                             <cmd.icon size={16} />
                          </div>
                          <span className="text-xs font-bold">{cmd.label}</span>
                       </div>
                       <div className="text-[10px] font-black text-gray-600 group-hover:text-primary/60 px-2 py-0.5 border border-white/5 rounded-md">{cmd.shortcut}</div>
                     </button>
                   ))}
                 </>
               ) : (
                 <div className="py-12 text-center space-y-2">
                    <Zap size={24} className="text-gray-700 mx-auto animate-pulse" />
                    <p className="text-xs font-bold text-gray-600">No agent matching &quot;{query}&quot; found in swarm.</p>
                 </div>
               )}
            </div>

            <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
               <p className="text-[9px] font-bold text-gray-600">Tip: Use ARROWS to navigate, ENTER to execute.</p>
               <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-gray-700 tracking-widest">Powered by Protocol v4.2</span>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
