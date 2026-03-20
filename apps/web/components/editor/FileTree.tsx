'use client';

import { FileText, Folder, ChevronDown, Plus, MoreVertical } from 'lucide-react';

interface FileTreeProps {
  files: Record<string, string>;
  activeFile: string | null;
  onSelect: (path: string) => void;
}

export default function FileTree({ files, activeFile, onSelect }: FileTreeProps) {
  // Simple flat list for now, but user can enhance with nested folder support
  const sortedFiles = Object.keys(files).sort();

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-white/5 w-64 select-none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#858585]">Explorer</span>
        <div className="flex items-center gap-1">
           <button className="p-1 hover:bg-white/10 rounded-md text-[#858585] hover:text-white transition-all">
              <Plus size={14} />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-4 py-1 flex items-center gap-2 group cursor-pointer">
           <ChevronDown size={14} className="text-[#858585]" />
           <Folder size={14} className="text-[#dcb67a]" />
           <span className="text-[11px] font-bold text-[#cccccc] uppercase tracking-tight">Project Root</span>
        </div>

        <div className="pl-6 mt-1 space-y-[1px]">
          {sortedFiles.map((path) => {
            const isActive = activeFile === path;
            
            return (
              <div
                key={path}
                onClick={() => onSelect(path)}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all group ${
                  isActive ? 'bg-[#37373d] text-white' : 'text-[#858585] hover:bg-[#2a2d2e] hover:text-[#cccccc]'
                }`}
              >
                <FileText size={14} className={isActive ? 'text-blue-400' : 'text-[#858585] group-hover:text-[#cccccc]'} />
                <span className="text-[12px] truncate flex-1 tracking-tight">{path}</span>
                {isActive && (
                   <MoreVertical size={12} className="opacity-0 group-hover:opacity-100 text-[#858585]" />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="p-4 bg-black/10 border-t border-white/5">
         <div className="flex items-center gap-2 text-[10px] text-[#858585] font-black uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            Branch: Main
         </div>
      </div>
    </div>
  );
}
