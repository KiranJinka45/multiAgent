'use client';

import { getSupabaseClient } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@configs/date';

interface Task {
    id: string;
    title: string;
    completed: boolean;
    created_at: string;
}

export default function DashboardPage() {
    const supabase = getSupabaseClient();
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) router.push('/login');
            else fetchTasks();
        };
        checkUser();
    }, [supabase, router]);

    const fetchTasks = async () => {
        const res = await fetch('/api/tasks');
        if (res.ok) {
            const data = await res.json();
            setTasks(data);
        }
        setLoading(false);
    };

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;
        const res = await fetch('/api/tasks', {
            method: 'POST',
            body: JSON.stringify({ title }),
        });
        if (res.ok) {
            setTitle('');
            fetchTasks();
        }
    };

    const toggleTask = async (id: string, completed: boolean) => {
        await fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ completed: !completed }),
        });
        fetchTasks();
    };

    const deleteTask = async (id: string) => {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        fetchTasks();
    };

    if (!mounted || loading) return <div className="p-8 font-mono text-sm opacity-50 uppercase tracking-widest">Initializing deterministic context...</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 selection:bg-primary/30">
            <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in duration-700">
                <header className="flex justify-between items-end border-b border-white/5 pb-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter uppercase">Task Registry</h1>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em]">Isolated Productivity Cluster</p>
                    </div>
                    <button
                        onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                        className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                    >
                        Disconnect
                    </button>
                </header>

                <form onSubmit={addTask} className="flex gap-4">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Define new task..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-white/20"
                    />
                    <button
                        type="submit"
                        className="px-8 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/90 transition-all"
                    >
                        Execute
                    </button>
                </form>

                <div className="space-y-3">
                    {tasks.map((task) => (
                        <div key={task.id} className="group flex items-center justify-between p-5 bg-white/[0.03] border border-white/5 rounded-[1.5rem] hover:border-white/10 transition-all">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => toggleTask(task.id, task.completed)}
                                    className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${task.completed ? 'bg-primary border-primary' : 'border-white/20'}`}
                                >
                                    {task.completed && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                </button>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold ${task.completed ? 'text-white/30 line-through' : 'text-white'}`}>{task.title}</span>
                                    <span className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-0.5">{formatDate(task.created_at)}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => deleteTask(task.id)}
                                className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity p-2"
                            >
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
