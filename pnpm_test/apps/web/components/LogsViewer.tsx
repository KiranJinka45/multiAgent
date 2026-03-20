// components/LogsViewer.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Terminal, Shield, CheckCircle, Package, Database, Layout, Loader2 } from "lucide-react";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

interface LogEntry {
    message: string;
    level: 'info' | 'error' | 'warn';
    timestamp: string;
}

export function LogsViewer({ buildId }: { buildId: string }) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const scrollRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = io(GATEWAY_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            setStatus('connected');
            socket.emit('subscribe', buildId);
        });

        socket.on('log', (data: LogEntry) => {
            setLogs((prev) => [...prev, data]);
        });

        socket.on('disconnect', () => {
            setStatus('disconnected');
        });

        return () => {
            socket.disconnect();
        };
    }, [buildId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const getIcon = (message: string) => {
        if (message.includes('Planner')) return <Shield className="text-blue-400" size={14} />;
        if (message.includes('Frontend')) return <Layout className="text-purple-400" size={14} />;
        if (message.includes('Backend')) return <Package className="text-yellow-400" size={14} />;
        if (message.includes('Database')) return <Database className="text-cyan-400" size={14} />;
        if (message.includes('complete') || message.includes('success')) return <CheckCircle className="text-green-400" size={14} />;
        return <Terminal className="text-gray-400" size={14} />;
    };

    return (
        <div className="flex flex-col h-full bg-[#0d0d0d] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
            <header className="px-4 py-2 border-b border-white/10 flex justify-between items-center bg-[#1a1a1a]">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-gray-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Live Build Logs</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-medium text-gray-500 uppercase">{status}</span>
                </div>
            </header>

            <div 
                ref={scrollRef}
                className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/10"
            >
                {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                        <Loader2 className="animate-spin" size={20} />
                        <p>Waiting for build streams...</p>
                    </div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-3 group">
                        <span className="text-gray-700 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        <div className="flex items-start gap-2">
                            <span className="mt-0.5">{getIcon(log.message)}</span>
                            <span className={`${log.level === 'error' ? 'text-red-400' : 'text-gray-300'} leading-relaxed`}>
                                {log.message}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
