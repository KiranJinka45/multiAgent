'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const supabase = getSupabaseClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeUsers: 0,
        waitlistCount: 0,
        totalBuilds: 0,
        totalCost: 0,
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadStats() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

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
                // Fetch basic count stats
                const { count: activeUsers } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_beta_user', true);
                const { count: waitlist } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_beta_user', false);
                const { count: builds } = await supabase.from('projects').select('*', { count: 'exact', head: true }).neq('status', 'draft');

                // Fetch metrics from API
                const metricsRes = await fetch('/api/metrics');
                const metricsData = metricsRes.ok ? await metricsRes.json() : { totalCostUsd: 0 };

                setStats({
                    activeUsers: activeUsers || 0,
                    waitlistCount: waitlist || 0,
                    totalBuilds: builds || 0,
                    totalCost: metricsData.totalCostUsd || 0,
                });
            } catch (err) {
                console.error(err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, [supabase, router]);

    if (loading) return <div className="p-12 text-center text-gray-400">Loading Admin Dashboard...</div>;
    if (error) return <div className="p-12 text-center text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                        Beta Command Center
                    </h1>
                    <p className="text-gray-400">Real-time platform KPIs and launch metrics</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <MetricCard title="Active Beta Users" value={stats.activeUsers} trend="+12% today" color="border-green-500/50" />
                    <MetricCard title="Waitlist Size" value={stats.waitlistCount} trend="+45 new" color="border-orange-500/50" />
                    <MetricCard title="Total Builds" value={stats.totalBuilds} trend="~5m avg duration" color="border-blue-500/50" />
                    <MetricCard title="API Cost (Est)" value={`$${stats.totalCost.toFixed(2)}`} trend="Groq token equivalent" color="border-red-500/50" />
                </div>

                <div className="bg-[#141414] border border-white/5 rounded-2xl p-8">
                    <h3 className="text-xl font-semibold mb-6 flex justify-between items-center">
                        Waitlist Management
                        <span className="text-sm font-normal text-gray-400">Owner Actions</span>
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                        To approve users, update the `is_beta_user` column to true in Supabase via SQL or Studio.
                        The middleware will automatically instantly grant them platform access.
                    </p>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, trend, color }: { title: string; value: string | number; trend: string; color: string }) {
    return (
        <div className={`bg-[#111111] border ${color} rounded-2xl p-6 shadow-lg`}>
            <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">{title}</h3>
            <div className="text-4xl font-bold tracking-tight mb-2">{value}</div>
            <div className="text-gray-500 text-xs italic">{trend}</div>
        </div>
    );
}
