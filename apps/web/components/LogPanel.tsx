'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal, X, ChevronRight, Hash } from 'lucide-react';

interface LogEntry {
  message: string;
  type: 'info' | 'error' | 'success';
  timestamp: string;
}

interface LogPanelProps {
  projectId: string;
}

export default function LogPanel({ projectId }: LogPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Socket server is on 3011 (from apps/api/services/socket.ts)
    const socket = io('http://localhost:3011', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-project', projectId);
      console.log(`[LogPanel] Connected to socket and joined project: ${projectId}`);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('project-log', (log: LogEntry) => {
      setLogs((prev) => [...prev, log]);
    });

    return () => {
      socket.disconnect();
    };
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-gray-300 font-mono text-xs border-t border-border/50 shadow-2xl overflow-hidden rounded-t-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-gray-500" />
          <span className="font-bold tracking-tight text-gray-400 uppercase text-[10px]">Build Logs</span>
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{projectId.split('-')[0]}</span>
          <button onClick={() => setLogs([])} className="hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparentSelection"
      >
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2 opacity-30 select-none">
            <Hash size={32} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Awaiting deployment logs...</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-3 group animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-gray-600 shrink-0 select-none w-4 text-right">{i + 1}</span>
              <div className="flex gap-2">
                <ChevronRight size={12} className="mt-0.5 text-gray-700 group-hover:text-gray-500 transition-colors" />
                <span className={`break-all whitespace-pre-wrap leading-relaxed ${
                  log.type === 'error' ? 'text-red-400 font-bold' : 
                  log.type === 'success' ? 'text-green-400 font-bold' : 
                  'text-gray-300'
                }`}>
                  {log.message}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
