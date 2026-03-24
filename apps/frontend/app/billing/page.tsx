'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@libs/utils';
import { useRouter } from 'next/navigation';

interface UsageStats {
    totalTokens: number;
    totalMissions: number;
    totalCost: number;
}

interface AiUsageLog {
    id: string;
    agentName: string;
    model: string;
    totalTokens: number;
    costUsd: number;
    timestamp: string;
}

export default function BillingPage() {
    const supabase = getSupabaseClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<{ plan_type?: string, stripe_customer_id?: string, tenant_id?: string } | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const [usageData, setUsageData] = useState<{ usage: UsageStats, logs: AiUsageLog[] } | null>(null);

    useEffect(() => {
        async function loadData() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            setProfile(profileData);

            try {
                const res = await fetch('/api/usage');
                const data = await res.json();
                if (data.usage) {
                    setUsageData(data);
                }
            } catch (error) {
                console.error('Failed to load usage data', error);
            }

            setLoading(false);
        }
        loadData();
    }, [supabase, router]);

    const handleUpgrade = async (plan: string) => {
        setPortalLoading(true);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan }),
            });
            const { url } = await res.json();
            if (url) window.location.assign(url);
        } catch (error) {
            console.error('Failed to initiate checkout', error);
        } finally {
            setPortalLoading(false);
        }
    };

    const handleManage = async () => {
        setPortalLoading(true);
        try {
            const res = await fetch('/api/stripe/portal', {
                method: 'POST',
            });
            const { url } = await res.json();
            if (url) window.location.assign(url);
        } catch (error) {
            console.error('Failed to initiate portal session', error);
        } finally {
            setPortalLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading...</div>;

    const currentPlan = profile?.plan_type || 'free';

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Billing & Subscription
                    </h1>
                    <p className="text-gray-400">Manage your plan and usage limits</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* Free Plan */}
                    <PlanCard
                        name="Free"
                        price="$0"
                        features={['3 builds / day', '1 concurrent build', '500k tokens / month']}
                        active={currentPlan === 'free'}
                        onSelect={() => { }}
                        disabled={currentPlan === 'free'}
                    />

                    {/* Pro Plan */}
                    <PlanCard
                        name="Pro"
                        price="$29"
                        description="/month"
                        features={['50 builds / day', '5 concurrent builds', '10M tokens / month', 'Priority Support']}
                        active={currentPlan === 'pro'}
                        onSelect={() => handleUpgrade('pro')}
                        disabled={currentPlan === 'pro' || currentPlan === 'scale'}
                        loading={portalLoading}
                    />

                    {/* Scale Plan */}
                    <PlanCard
                        name="Scale"
                        price="$99"
                        description="/month"
                        features={['200 builds / day', '20 concurrent builds', '50M tokens / month', 'Dedicated Infrastructure']}
                        active={currentPlan === 'scale'}
                        onSelect={() => handleUpgrade('scale')}
                        disabled={currentPlan === 'scale'}
                        loading={portalLoading}
                    />
                </div>

                {profile?.stripe_customer_id && (
                    <div className="bg-[#141414] border border-gray-800 rounded-xl p-6 flex items-center justify-between mb-12">
                        <div>
                            <h3 className="text-lg font-semibold mb-1">Subscription Management</h3>
                            <p className="text-sm text-gray-400">Update payment methods or cancel your subscription</p>
                        </div>
                        <button
                            onClick={handleManage}
                            disabled={portalLoading}
                            className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-sm font-medium"
                        >
                            {portalLoading ? 'Redirecting...' : 'Manage on Stripe'}
                        </button>
                    </div>
                )}

                {/* AI Usage & Cost Section */}
                <section className="mt-16">
                    <header className="mb-8">
                        <h2 className="text-2xl font-bold mb-2">AI Usage & Infrastructure Costs</h2>
                        <p className="text-gray-400">Real-time tracking of your LLM consumption and operational expenses</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Token Usage Card */}
                        <div className="bg-[#111] border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16 transition-all group-hover:bg-blue-500/20"></div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Missions & Tokens</h3>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-4xl font-bold">{(usageData?.usage?.totalTokens / 1000).toFixed(1) || '0.0'}k</span>
                                <span className="text-gray-400">/ {currentPlan === 'free' ? '500k' : currentPlan === 'pro' ? '10M' : '50M'}</span>
                            </div>
                            <div className="mt-6 w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-1000" 
                                    style={{ width: `${Math.min(((usageData?.usage?.totalTokens || 0) / (currentPlan === 'free' ? 500000 : currentPlan === 'pro' ? 10000000 : 50000000)) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <p className="mt-4 text-xs text-gray-400">
                                {usageData?.usage?.totalMissions || 0} missions completed this billing cycle
                            </p>
                        </div>

                        {/* Estimated Cost Card */}
                        <div className="bg-[#111] border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full -mr-16 -mt-16 transition-all group-hover:bg-purple-500/20"></div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Infrastructure Cost</h3>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-4xl font-bold">${usageData?.usage?.totalCost.toFixed(2) || '0.00'}</span>
                                <span className="text-green-500 text-sm font-medium bg-green-500/10 px-2 py-0.5 rounded ml-2">Live</span>
                            </div>
                            <p className="mt-6 text-sm text-gray-400 leading-relaxed">
                                Aggregated cost across all specialized agents and model providers (Groq, Anthropic, OpenAI).
                            </p>
                        </div>
                    </div>

                    {/* Usage Logs Table */}
                    <div className="bg-[#0e0e0e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="font-semibold">Recent AI Activity</h3>
                            <span className="text-xs text-gray-500">Showing last 10 operations</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Timestamp</th>
                                        <th className="px-6 py-4 font-medium">Agent</th>
                                        <th className="px-6 py-4 font-medium">Model</th>
                                        <th className="px-6 py-4 font-medium">Tokens</th>
                                        <th className="px-6 py-4 font-medium text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {usageData?.logs.map((log: AiUsageLog) => (
                                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-gray-400">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md text-xs border border-blue-500/20">
                                                    {log.agentName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300 font-mono text-xs">{log.model}</td>
                                            <td className="px-6 py-4 text-gray-400">{log.totalTokens.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-medium text-white">${log.costUsd.toFixed(4)}</td>
                                        </tr>
                                    ))}
                                    {(!usageData?.logs || usageData.logs.length === 0) && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                No AI activity recorded yet for this billing cycle.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

interface PlanCardProps {
    name: string;
    price: string;
    description?: string;
    features: string[];
    active: boolean;
    onSelect: () => void;
    disabled?: boolean;
    loading?: boolean;
}

function PlanCard({ name, price, description, features, active, onSelect, disabled, loading }: PlanCardProps) {
    return (
        <div className={`p-6 rounded-2xl border transition-all ${active ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'bg-[#141414] border-gray-800'}`}>
            <div className="mb-4">
                <h3 className="text-xl font-bold mb-1">{name}</h3>
                <div className="flex items-baseline">
                    <span className="text-3xl font-bold">{price}</span>
                    <span className="text-sm text-gray-400 ml-1">{description}</span>
                </div>
            </div>

            <ul className="space-y-3 mb-8">
                {features.map((f: string, i: number) => (
                    <li key={i} className="flex items-center text-sm text-gray-300">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                    </li>
                ))}
            </ul>

            <button
                onClick={onSelect}
                disabled={disabled || loading}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${active
                    ? 'bg-blue-500 text-white cursor-default'
                    : disabled
                        ? 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-gray-200'
                    }`}
            >
                {active ? 'Current Plan' : 'Select Plan'}
            </button>
        </div>
    );
}
