'use client';

import {
    Zap, Shield, Search, BarChart3, Settings2,
    Cpu, Layers, Users2, Scale, Database, Clock, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const strategySections = [
    {
        title: "Model Selection Strategy",
        icon: Cpu,
        color: "text-blue-500",
        items: [
            "Fast (Gemini 1.5 Flash): Best for simple automation, data extraction, and quick chat.",
            "Thinking (Gemini 1.5 Pro): Deep reasoning, logical complex tasks, and multi-step orchestration.",
            "Pro (Gemini 2.0 Feature): State-of-the-art vision, ultra-low latency, and advanced tool use."
        ],
        useCase: "Customer support bots (Fast) vs. Software architectural planning (Thinking/Pro)."
    },
    {
        title: "RAG & Knowledge Retrieval",
        icon: Search,
        color: "text-emerald-500",
        items: [
            "Vector Embeddings: Industry-standard semantic search via Supabase Vector.",
            "Hybrid Search: Combining keyword and vector for 99% retrieval accuracy.",
            "Chunking Optimization: Context-aware splitting for better LLM comprehension."
        ],
        useCase: "Talking to your company's private PDF library or internal legal docs."
    },
    {
        title: "Latency & Scalability",
        icon: Clock,
        color: "text-orange-500",
        items: [
            "Streaming Responses: Real-time UI updates to reduce perceived latency.",
            "Edge Deployment: Compute near users for light-speed interactions.",
            "Infinite Scaling: Stateless architecture ready for million-user orbits."
        ],
        useCase: "E-commerce real-time product recommendations during peak sales traffic."
    },
    {
        title: "Security & Safety",
        icon: Shield,
        color: "text-red-500",
        items: [
            "RLS (Row Level Security): Enterprise-grade data isolation in Supabase.",
            "Prompt Injection Guards: Advanced sanitization of user inputs.",
            "PII Masking: Automatic detection and filtering of sensitive data."
        ],
        useCase: "Healthcare apps handling HIPAA-compliant patient messaging."
    },
    {
        title: "Observability & Monitoring",
        icon: BarChart3,
        color: "text-purple-500",
        items: [
            "LLM Tracing: Step-by-step logs of thought processes and tool calls.",
            "Token Tracking: Real-time cost and usage metrics.",
            "Anomaly Detection: Automated alerts for system drifts or spikes."
        ],
        useCase: "Debugging multi-agent systems when thinking paths go 'off-orbit'."
    },
    {
        title: "Quality & Fine-Tuning",
        icon: Layers,
        color: "text-cyan-500",
        items: [
            "Synthetic Data Prep: Auto-generated high-quality training sets.",
            "PEFT/LoRA: Efficient fine-tuning for domain-specific mastery.",
            "Human-in-the-Loop: Integrated review flows for constant improvement."
        ],
        useCase: "Training a model to write legal briefs in a very specific firm's voice."
    },
    {
        title: "Compliance & Legal",
        icon: Scale,
        color: "text-indigo-500",
        items: [
            "GDPR/CCPA: Built-in data deletion and export workflows.",
            "Audit Logs: Complete history of all mission critical actions.",
            "Attribution: Clear citations for all retrieved facts."
        ],
        useCase: "FinTech audit trails for automated financial advice generation."
    },
    {
        title: "Cost Optimization",
        icon: Database,
        color: "text-yellow-500",
        items: [
            "Cache Strategy: Intelligent reuse of common AI responses.",
            "Smart Routing: Smaller models for simple tasks to save 80% cost.",
            "Token Pruning: Intelligent context management to minimize overhead."
        ],
        useCase: "Reducing monthly AI bills by 60% using local semantic caching."
    }
];

export default function StrategyGuide() {
    return (
        <div className="max-w-6xl mx-auto p-6 space-y-12 pb-32">
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Strategic Chat Architecture
                </h1>
                <p className="text-muted-foreground text-[15px] max-w-2xl mx-auto">
                    A blueprint for enterprise-grade autonomous agents and high-performance orbits.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {strategySections.map((section, idx) => (
                    <motion.div
                        key={section.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-xl bg-accent ${section.color}`}>
                                    <section.icon size={20} />
                                </div>
                                <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
                            </div>
                            <ul className="space-y-3 mb-6">
                                {section.items.map((item, i) => (
                                    <li key={i} className="flex gap-3 text-xs text-muted-foreground leading-relaxed">
                                        <div className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="mt-auto pt-4 border-t border-border/50">
                            <span className="text-[9px] uppercase font-bold text-primary tracking-widest block mb-1">Real World Use Case</span>
                            <p className="text-[11px] text-foreground italic">{section.useCase}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Help & Documentation Section */}
            <div id="help" className="mt-20 p-8 rounded-3xl bg-accent/20 border border-border space-y-8 animate-in fade-in duration-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <Settings2 className="text-primary" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Help & Documentation</h2>
                        <p className="text-xs text-muted-foreground">Everything you need to master your MultiAgent environment.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <h3 className="font-bold text-foreground flex items-center gap-2 text-[13px]">
                            <Zap size={14} className="text-yellow-500" /> Getting Started
                        </h3>
                        <p className="text-xs text-muted-foreground">New to MultiAgent? Start by creating a chat in the sidebar. Select a model based on your complexity needs (Flash for speed, Pro for reasoning).</p>
                    </div>
                    <div className="space-y-3">
                        <h3 className="font-bold text-foreground flex items-center gap-2 text-[13px]">
                            <Shield size={14} className="text-red-500" /> Account & Security
                        </h3>
                        <p className="text-xs text-muted-foreground">Manage your profile and chat history via the user menu in the bottom left. All data is protected via Enterprise RLS.</p>
                    </div>
                    <div className="space-y-3">
                        <h3 className="font-bold text-foreground flex items-center gap-2 text-[13px]">
                            <Layers size={14} className="text-blue-500" /> Tool Integration
                        </h3>
                        <p className="text-xs text-muted-foreground">Use the input bar's 'Tools' menu to trigger Deep Research or Canvas modes. These utilize specialized LLM architectures for high-quality outputs.</p>
                    </div>
                    <div className="space-y-3">
                        <h3 className="font-bold text-foreground flex items-center gap-2 text-[13px]">
                            <Users2 size={14} className="text-emerald-500" /> Collaboration
                        </h3>
                        <p className="text-xs text-muted-foreground">Share chats or start group chats via the context menu on any chat item in the sidebar history.</p>
                    </div>
                </div>
            </div>

            <div className="p-8 rounded-3xl bg-primary/5 border border-primary/20 text-center space-y-4">
                <Sparkles className="mx-auto text-primary" size={28} />
                <h3 className="text-lg font-bold">Chat Ready?</h3>
                <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                    These strategies ensure your agents are secure, scalable, and cost-effective.
                    Close this window or select 'New chat' to begin your next orbit.
                </p>
            </div>
        </div>
    );
}
