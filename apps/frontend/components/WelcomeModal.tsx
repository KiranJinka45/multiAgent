'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@packages/utils';
import { toast } from 'sonner';

export default function WelcomeModal() {
    const supabase = getSupabaseClient();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkOnboarding = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data } = await supabase
                .from('user_profiles')
                .select('has_completed_onboarding')
                .eq('id', session.user.id)
                .single();

            if (data && !data.has_completed_onboarding) {
                setIsOpen(true);
            }
        };

        checkOnboarding();
    }, [supabase]);

    const handleComplete = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/onboarding/complete', { method: 'POST' });
            if (res.ok) {
                setIsOpen(false);
                toast.success('Welcome aboard!');
            } else {
                toast.error('Failed to update onboarding status');
            }
        } catch (error) {
            console.error('Onboarding complete error', error);
            toast.error('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />

                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Welcome to MultiAgent Beta
                </h2>

                <div className="space-y-4 text-gray-300 text-sm leading-relaxed mb-8">
                    <p>
                        You&apos;ve been selected to participate in our exclusive private beta. We&apos;re building the future of autonomous software engineering.
                    </p>

                    <ul className="space-y-3 mt-4">
                        <li className="flex items-start gap-3">
                            <span className="text-emerald-500">✓</span>
                            <span><strong>Command Anything:</strong> Type a prompt or use the &apos;/&apos; command to trigger complex workflows.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-blue-500">✓</span>
                            <span><strong>Full Autonomy:</strong> Watch as agents debate, plan, write code, and execute terminal commands.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-purple-500">✓</span>
                            <span><strong>Feedback is Gold:</strong> Use the &quot;Report Issue&quot; button if you encounter bugs or strange behavior.</span>
                        </li>
                    </ul>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleComplete}
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium flex items-center gap-2"
                    >
                        {loading && (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        Let&apos;s Build
                    </button>
                </div>
            </div>
        </div>
    );
}
