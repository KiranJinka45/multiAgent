'use client';

import { supabase } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function WaitlistPage() {
    
    const router = useRouter();
    const [email, setEmail] = useState('');

    useEffect(() => {
        async function fetchUser() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
                setEmail(session.user.email);
            }
        }
        fetchUser();
    }, [supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 font-sans">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="animate-pulse">
                    <svg className="w-16 h-16 mx-auto text-blue-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Private Beta Access
                </h1>

                <div className="bg-[#141414] border border-white/5 rounded-2xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.05)]">
                    <p className="text-gray-400 mb-6 leading-relaxed">
                        Thanks for joining! We&apos;ve added <strong>{email || 'your email'}</strong> to our waitlist.
                        We are currently limiting access to ensure system stability and high-quality generation.
                    </p>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-400 mb-8">
                        You&apos;ll receive an email as soon as a spot opens up.
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-medium flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>

                <p className="text-xs text-gray-600">
                    If you believe you should have access, please contact support.
                </p>
            </div>
        </div>
    );
}

