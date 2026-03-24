'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@libs/utils';
import { useRouter } from 'next/navigation';

interface RetentionMetrics {
    total_users: number;
    d1_retention_rate: number;
    d1_count: number;
    d7_retention_rate: number;
    d7_count: number;
}

export default function RetentionDashboard() {
    const supabase = getSupabaseClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<RetentionMetrics | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadMetrics() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            // Check if user is owner
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profile?.role !== 'owner') {
                setError('Access Denied: Owner role required');
                setLoading(false);
                return;
            }

            try {
                const res = await fetch('/api/retention-metrics');
                if (!res.ok) throw new Error('Failed to fetch metrics');
                const data = await res.json();
                setMetrics(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load retention data');
            } finally {
                setLoading(false);
            }
        }
        loadMetrics();
    }, [supabase, router]);

    if (loading) return <div className="p-12 text-center text-gray-400">Loading Retention Analytics...</div>;
    if (error) return <div className="p-12 text-center text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                            Retention Control Plane
                        </h1>
                        <p className="text-gray-400">Monitoring user lifecycle and cohort health</p>
                    </div>
                    <div className="text-right">
                        <span className="text-gray-500 text-xs uppercase tracking-widest">Total Active Cohort</span>
                        <div className="text-3xl font-mono font-bold">{metrics?.total_users || 0} Users</div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {/* D1 Retention */}
                    <MetricCard
                        title="D1 Retention"
                        value={`${metrics?.d1_retention_rate || 0}%`}
                        count={metrics?.d1_count || 0}
                        description="Percentage of users returning exactly 1 day after first build"
                        color="border-emerald-500/50"
                        glow="shadow-[0_0_40px_rgba(16,185,129,0.1)]"
                    />

                    {/* D7 Retention */}
                    <MetricCard
                        title="D7 Retention"
                        value={`${metrics?.d7_retention_rate || 0}%`}
                        count={metrics?.d7_count || 0}
                        description="Percentage of users active 7+ days after first build"
                        color="border-cyan-500/50"
                        glow="shadow-[0_0_40px_rgba(6,182,212,0.1)]"
                    />
                </div>

                <div className="bg-[#141414] border border-white/5 rounded-2xl p-8">
                    <h3 className="text-xl font-semibold mb-6">Growth Insights</h3>
                    <div className="space-y-4">
                        <InsightRow
                            label="Target D1 Benchmark"
                            value="40.00%"
                            status={(metrics?.d1_retention_rate || 0) >= 40 ? 'positive' : 'neutral'}
                        />
                        <InsightRow
                            label="Target D7 Benchmark"
                            value="15.00%"
                            status={(metrics?.d7_retention_rate || 0) >= 15 ? 'positive' : 'neutral'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, count, description, color, glow }: { title: string; value: string; count: number; description: string; color: string; glow: string }) {
    return (
        <div className={`bg-[#111111] border ${color} rounded-3xl p-8 ${glow}`}>
            <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-tighter">{title}</h3>
            <div className="flex items-baseline gap-4 mb-2">
                <div className="text-6xl font-bold tracking-tighter">{value}</div>
                <div className="text-gray-500 text-sm italic">{count} users</div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{description}</p>
        </div>
    );
}

function InsightRow({ label, value, status }: { label: string; value: string; status: 'positive' | 'neutral' }) {
    return (
        <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
            <span className="text-gray-400">{label}</span>
            <div className="flex items-center gap-3">
                <span className="font-mono text-gray-300">{value}</span>
                <span className={`w-2 h-2 rounded-full ${status === 'positive' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-700'}`}></span>
            </div>
        </div>
    );
}
