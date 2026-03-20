'use client';

import { X, Hash, FileCode, Plus } from 'lucide-react';

interface TabsProps {
  openTabs: string[];
  activeTab: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  dirtyFiles: Record<string, boolean>;
}

export default function Tabs({ openTabs, activeTab, onSelect, onClose, dirtyFiles }: TabsProps) {
  return (
    <div className="flex bg-[#252526] h-10 border-b border-white/5 overflow-x-auto scrollbar-none group/tabs">
      {openTabs.map((path) => {
        const isActive = activeTab === path;
        const isDirty = dirtyFiles[path];
        const fileName = path.split('/').pop() || path;
        const extension = fileName.split('.').pop() || '';

        return (
          <div
            key={path}
            onClick={() => onSelect(path)}
            className={`flex items-center gap-2 px-4 h-full cursor-pointer border-r border-white/5 transition-all select-none min-w-[120px] max-w-[200px] group ${
              isActive 
                ? 'bg-[#1e1e1e] border-t-2 border-t-primary' 
                : 'text-gray-500 hover:bg-[#2a2d2e] hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
               <FileCode size={12} className={isActive ? 'text-primary' : 'text-gray-600'} />
               <span className={`text-[12px] truncate ${isActive ? 'font-bold text-gray-200' : 'font-medium'}`}>
                  {fileName}
               </span>
            </div>

            <div className="flex items-center ml-auto pl-2">
              {isDirty ? (
                <div className="w-2 h-2 rounded-full bg-primary/60 border border-primary animate-pulse group-hover:hidden" />
              ) : null}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(path);
                }}
                className={`p-0.5 rounded-md hover:bg-white/10 transition-colors ${
                  isDirty ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                } ${isActive ? 'text-gray-400 hover:text-white' : 'text-gray-600'}`}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}

      <button className="px-3 flex items-center justify-center hover:bg-white/5 text-gray-600 hover:text-gray-300 transition-all">
         <Plus size={16} />
      </button>
    </div>
  );
}
