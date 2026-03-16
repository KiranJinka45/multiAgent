'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function BillingPage() {
    const supabase = getSupabaseClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<{ plan_type?: string, stripe_customer_id?: string } | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const { data } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            setProfile(data);
            setLoading(false);
        }
        loadProfile();
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
                    <div className="bg-[#141414] border border-gray-800 rounded-xl p-6 flex items-center justify-between">
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
