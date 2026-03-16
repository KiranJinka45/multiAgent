'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Frontend Error Caught:', error, errorInfo);
        // In a real SaaS, we would send this to Sentry or a logging endpoint
    }

    private handleRetry = () => {
        this.setState({ hasError: false });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#020202] flex items-center justify-center p-6 font-sans">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full bg-[#080808] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-8"
                    >
                        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
                            <AlertTriangle className="text-red-500" size={40} />
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-2xl font-black text-white tracking-widest uppercase italic">System Disruption</h1>
                            <p className="text-sm text-white/40 leading-relaxed">
                                An unexpected technical anomaly has interrupted the Mission Control interface.
                                Our diagnostic systems have been notified.
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-left">
                                <p className="text-[10px] text-red-400 font-mono break-all">{this.state.error.message}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={this.handleRetry}
                                className="flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm hover:bg-white/10 transition-all group"
                            >
                                <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                                Retry
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center justify-center gap-3 px-6 py-4 bg-primary rounded-2xl text-primary-foreground font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-primary/20"
                            >
                                <Home size={18} />
                                Home
                            </button>
                        </div>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}
