'use client';

import { Zap, AlertCircle, BarChart3 } from 'lucide-react';

interface UsageData {
  tokens: number;
  tokenLimit: number;
  buildMinutes: number;
  minuteLimit: number;
}

export default function UsagePanel({ 
  usage = { tokens: 820000, tokenLimit: 1000000, buildMinutes: 440, minuteLimit: 500 },
  onUpgrade 
}: { 
  usage?: UsageData,
  onUpgrade?: () => void 
}) {
  const tokenProgress = (usage.tokens / usage.tokenLimit) * 100;
  const minuteProgress = (usage.buildMinutes / usage.minuteLimit) * 100;

  const isNearingLimit = tokenProgress > 80 || minuteProgress > 80;

  return (
    <div className="p-6 bg-[#18181B] border border-white/5 rounded-2xl space-y-8 w-full shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            Plan Usage
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Organization: MultiAgent Pro</p>
        </div>
        <button 
          onClick={onUpgrade}
          className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Zap size={14} fill="currentColor" />
          Upgrade
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">AI Compute (Tokens)</span>
              <div className="text-2xl font-black text-white">{(usage.tokens / 1000).toFixed(0)}k</div>
            </div>
            <span className="text-[10px] font-bold text-gray-500">{(usage.tokenLimit / 1000).toFixed(0)}k LIMIT</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${tokenProgress > 90 ? 'bg-red-500' : tokenProgress > 70 ? 'bg-amber-500' : 'bg-primary'}`}
              style={{ width: `${tokenProgress}%` }} 
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Build Runtime (Mins)</span>
              <div className="text-2xl font-black text-white">{usage.buildMinutes}</div>
            </div>
            <span className="text-[10px] font-bold text-gray-500">{usage.minuteLimit} LIMIT</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${minuteProgress > 90 ? 'bg-red-500' : minuteProgress > 70 ? 'bg-amber-500' : 'bg-purple-500'}`}
              style={{ width: `${minuteProgress}%` }} 
            />
          </div>
        </div>
      </div>

      {isNearingLimit && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 items-start animate-pulse">
          <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-500">Quota Approaching Limit</p>
            <p className="text-[10px] text-amber-500/80 font-medium leading-relaxed">
              You have consumed over 85% of your organization&apos;s monthly allocation. Automatic builds may be throttled soon.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
