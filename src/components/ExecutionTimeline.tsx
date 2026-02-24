'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { CheckCircle2, Clock, XCircle, PlayCircle } from 'lucide-react';

export const ExecutionTimeline = () => {
    const { executionContext, logs } = useStore();

    if (!executionContext) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl border-gray-700/50">
                <Clock className="w-8 h-8 text-gray-500 mb-2 animate-pulse" />
                <p className="text-gray-400 font-medium">No active execution</p>
            </div>
        );
    }

    const agents = Object.values(executionContext.agentResults);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Agent Status Cards */}
                {agents.map((agent) => (
                    <div key={agent.agentName} className="p-4 rounded-xl border border-gray-700/50 bg-gray-800/40 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-200">{agent.agentName}</span>
                            {agent.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                            {agent.status === 'failed' && <XCircle className="w-5 h-5 text-red-400" />}
                            {agent.status === 'in_progress' && <Clock className="w-5 h-5 text-blue-400 animate-spin" />}
                            {agent.status === 'pending' && <PlayCircle className="w-5 h-5 text-gray-500" />}
                        </div>
                        <div className="text-xs text-gray-400">
                            Attempts: {agent.attempts}
                        </div>
                        {agent.endTime && (
                            <div className="text-[10px] text-gray-500 mt-1">
                                Finished at {new Date(agent.endTime).toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Live Logs */}
            <div className="p-4 rounded-xl border border-gray-700/50 bg-black/50 font-mono text-sm h-48 overflow-y-auto scrollbar-hide">
                <div className="text-gray-500 mb-2 border-b border-gray-700/50 pb-1 uppercase text-xs tracking-widest font-bold">
                    System Logs
                </div>
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 text-gray-300">
                        <span className="text-blue-500 mr-2">{'>'}</span>{log}
                    </div>
                ))}
            </div>
        </div>
    );
};
