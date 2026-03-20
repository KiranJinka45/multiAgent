'use client';

import { useState, useRef } from 'react';
import { RefreshCw, ExternalLink, Shield, Monitor, Smartphone, Tablet } from 'lucide-react';

interface PreviewProps {
  url: string;
}

export default function Preview({ url }: PreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const reload = () => {
    setIframeKey((prev) => prev + 1);
    setIsLoading(true);
  };

  const getWidth = () => {
    switch (viewMode) {
      case 'mobile': return 'w-[375px]';
      case 'tablet': return 'w-[768px]';
      default: return 'w-full';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-900 border-l border-border/50 overflow-hidden shadow-2xl rounded-tr-xl">
      {/* Browser Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-950 border-b border-border/50 h-14">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500/80 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 shadow-sm" />
          </div>
          <div className="flex items-center bg-gray-100 dark:bg-zinc-900 px-4 py-1.5 rounded-full border border-border/50 group hover:border-primary/50 transition-all w-[320px] md:w-[480px]">
             <Shield size={12} className="text-green-500 mr-2" />
             <span className="text-[11px] font-bold text-gray-500 truncate select-none">{url || 'https://mission-preview.local'}</span>
          </div>
          <button 
            onClick={reload}
            className="p-2 hover:bg-accent rounded-lg text-gray-400 hover:text-foreground transition-all active:rotate-180 duration-500"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-accent/30 p-1 rounded-xl border border-border/50">
          <button onClick={() => setViewMode('desktop')} className={`p-2 rounded-lg transition-all ${viewMode === 'desktop' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Monitor size={14} />
          </button>
          <button onClick={() => setViewMode('tablet')} className={`p-2 rounded-lg transition-all ${viewMode === 'tablet' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Tablet size={14} />
          </button>
          <button onClick={() => setViewMode('mobile')} className={`p-2 rounded-lg transition-all ${viewMode === 'mobile' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Smartphone size={14} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.open(url, '_blank')}
            className="p-2 hover:bg-accent rounded-lg text-gray-400 hover:text-foreground transition-all"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-zinc-200/30 dark:bg-black/20 relative group overflow-hidden">
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
        
        <div className={`h-full bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl ring-1 ring-border/50 overflow-hidden transition-all duration-500 ${getWidth()} ${isLoading ? 'blur-sm grayscale opacity-50' : 'opacity-100'}`}>
          {url ? (
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={url}
              className="w-full h-full border-none"
              sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
              onLoad={() => setIsLoading(false)}
            />
          ) : (
             <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-12 text-center select-none opacity-40">
                <div className="w-24 h-24 rounded-full border-4 border-dashed border-gray-400 animate-spin-slow flex items-center justify-center text-4xl">
                   🚀
                </div>
                <div>
                   <h3 className="text-lg font-black uppercase tracking-widest text-gray-600 mb-2">Awaiting Mission Orbit</h3>
                   <p className="text-sm font-medium text-gray-500">Your live preview will appear once the deployment sequence begins.</p>
                </div>
             </div>
          )}
        </div>

        {isLoading && url && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
             <div className="bg-background/80 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-border/50 flex items-center gap-4">
                <RefreshCw size={18} className="animate-spin text-primary" />
                <span className="text-sm font-black uppercase tracking-widest">Targeting Host...</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
