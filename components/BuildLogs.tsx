import React, { useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';

interface BuildLogsProps {
    logs?: string[];
    isGenerating: boolean;
}

export default function BuildLogs({ logs = [], isGenerating }: BuildLogsProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="flex flex-col h-full bg-[#050505] font-mono border-l border-white/5 relative overflow-hidden">
            <div className="h-10 px-4 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-white/40" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-white/40">Kernel Output</span>
                </div>
                {isGenerating && (
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[9px] text-primary uppercase tracking-widest">Streaming</span>
                    </div>
                )}
            </div>

            <div
                ref={scrollRef}
                className="flex-1 p-4 overflow-y-auto text-[11px] leading-relaxed custom-scrollbar text-gray-400"
            >
                {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full italic opacity-30">
                        Waiting for kernel telemetry...
                    </div>
                ) : (
                    <div className="space-y-1">
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-4 hover:bg-white/[0.02] py-0.5 px-2 rounded -mx-2">
                                <span className="text-white/20 select-none tabular-nums w-8 text-right">
                                    {(i + 1).toString().padStart(3, '0')}
                                </span>
                                <span className={`flex-1 ${log.toLowerCase().includes('error') ? 'text-red-400 font-bold' :
                                        log.toLowerCase().includes('success') || log.toLowerCase().includes('complete') ? 'text-green-400' :
                                            log.toLowerCase().includes('warn') ? 'text-yellow-400' : ''
                                    }`}>
                                    {log}
                                </span>
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="flex gap-4 py-0.5 px-2">
                                <span className="text-white/20 select-none tabular-nums w-8 text-right">
                                    {(logs.length + 1).toString().padStart(3, '0')}
                                </span>
                                <span className="w-2 h-3 bg-primary animate-pulse mt-0.5" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
