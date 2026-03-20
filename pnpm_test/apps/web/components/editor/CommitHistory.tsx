'use client';

import { History, GitCommit, CornerUpLeft, Clock, User, MessageCircle } from 'lucide-react';

interface Commit {
  hash: string;
  message: string;
  date: string;
  author_name: string;
}

interface CommitHistoryProps {
  commits: Commit[];
  onRevert: (hash: string) => void;
  projectId: string;
}

export default function CommitHistory({ commits, onRevert, projectId }: CommitHistoryProps) {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-white/10 w-80 select-none overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-white/5 shadow-sm">
        <div className="flex items-center gap-2">
          <History size={16} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Commit History</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase">
            {projectId.split('-')[0]}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {commits.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-600 gap-4 opacity-50">
             <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <GitCommit size={32} />
             </div>
             <p className="text-xs font-bold leading-relaxed uppercase tracking-tighter">No timeline snapshots detected yet. Begin developing to track evolution.</p>
          </div>
        ) : (
          commits.map((commit) => (
            <div 
              key={commit.hash} 
              className="group relative pl-4 border-l border-white/5 py-1 hover:border-primary/50 transition-all"
            >
              {/* Timeline Marker */}
              <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-white/10 group-hover:bg-primary transition-all shadow-[0_0_8px_rgba(255,255,255,0.1)] group-hover:shadow-primary/40" />
              
              <div className="bg-[#252526] p-3 rounded-xl border border-white/5 group-hover:border-primary/20 shadow-lg transition-all group-hover:translate-x-1">
                <div className="flex items-start justify-between mb-2">
                   <div className="flex items-center gap-2 text-primary">
                      <MessageCircle size={12} />
                      <h4 className="text-[13px] font-bold text-gray-100 truncate">{commit.message}</h4>
                   </div>
                   <button 
                     onClick={() => onRevert(commit.hash)}
                     className="p-1.5 hover:bg-primary/20 hover:text-primary rounded-lg text-gray-500 transition-all group/btn"
                     title="Restore this version"
                   >
                     <CornerUpLeft size={14} className="group-hover/btn:-rotate-45 transition-transform" />
                   </button>
                </div>

                <div className="flex flex-col gap-1.5">
                   <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                      <Clock size={10} />
                      {new Date(commit.date).toLocaleString()}
                   </div>
                   <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                      <User size={10} />
                      {commit.author_name}
                      <span className="text-gray-700 mx-1">/</span>
                      <span className="font-mono text-[9px] text-gray-600">{commit.hash.substring(0, 7)}</span>
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-black/20 border-t border-white/5">
         <button className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all border border-white/5">
            Export History
         </button>
      </div>
    </div>
  );
}
