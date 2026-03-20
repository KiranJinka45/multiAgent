'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Users } from 'lucide-react';

interface Org {
  id: string;
  name: string;
}

export default function OrgSwitch() {
  const [isOpen, setIsOpen] = useState(false);
  const [orgs] = useState<Org[]>([
    { id: 'org-1', name: 'Personal workspace' },
    { id: 'org-2', name: 'Acme Corp' }
  ]);
  const [activeOrg, setActiveOrg] = useState(orgs[0]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
      >
        <div className="w-5 h-5 bg-primary/20 rounded-md flex items-center justify-center text-[10px] font-bold text-primary">
          {activeOrg.name[0]}
        </div>
        <span className="text-xs font-medium text-gray-300">{activeOrg.name}</span>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-[#252526] border border-white/10 rounded-xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">Organizations</div>
            {orgs.map(org => (
              <button
                key={org.id}
                onClick={() => {
                  setActiveOrg(org);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${activeOrg.id === org.id ? 'bg-primary/10 text-primary font-bold' : 'text-gray-400 hover:bg-white/5'}`}
              >
                <div className={`w-2 h-2 rounded-full ${activeOrg.id === org.id ? 'bg-primary' : 'bg-gray-700'}`} />
                {org.name}
              </button>
            ))}
          </div>
          <div className="border-t border-white/5 p-2 bg-white/5">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-all">
              <Plus size={14} />
              Create Organization
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-all">
              <Users size={14} />
              Team Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
