'use client';

import { getSupabaseClient } from '@lib/supabaseClient';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Github } from 'lucide-react';

export default function LoginPage() {
    const supabase = getSupabaseClient();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) router.push('/projects');
        else alert(error.message);
    };

    const handleSignUp = async () => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (!error) alert("Check your email for confirmation link!");
        else alert(error.message);
    };

    const handleGithubLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                scopes: 'repo', // Required to create and push to repositories
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Secure Access</h1>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] mt-2">DETERMINISTIC CI AUTH</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Registry Email"
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                    <input
                        type="password"
                        placeholder="Security Key"
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            className="w-1/2 py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/90 transition-all shadow-xl"
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={handleSignUp}
                            className="w-1/2 py-4 bg-transparent border border-white/20 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                        >
                            Sign Up
                        </button>
                    </div>
                </form>

                <div className="flex items-center gap-4 text-white/20">
                    <div className="h-px bg-white/10 flex-1" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">or authenticate via</span>
                    <div className="h-px bg-white/10 flex-1" />
                </div>

                <button
                    onClick={handleGithubLogin}
                    className="w-full py-4 bg-[#24292e] hover:bg-[#2f363d] text-white flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-xl"
                >
                    <Github size={18} />
                    GitHub
                </button>
            </div>
        </div>
    );
}
