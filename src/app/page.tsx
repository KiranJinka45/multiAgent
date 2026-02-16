
'use client';

import { useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import MobileMenu from '@/components/MobileMenu';
import TaskInput from '@/components/TaskInput';
import TaskList, { Task } from '@/components/TaskList';
// removed unused imports

import TopNav from '@/components/TopNav';

export default function Dashboard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const addTask = useCallback((title: string) => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            completed: false,
            createdAt: new Date().toISOString(),
        };
        setTasks(prev => [newTask, ...prev]);
    }, []);

    const toggleTask = useCallback((id: string) => {
        setTasks(prev => prev.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));
    }, []);

    const deleteTask = useCallback((id: string) => {
        setTasks(prev => prev.filter(task => task.id !== id));
    }, []);

    const completedCount = tasks.filter(t => t.completed).length;

    return (
        <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-blue-500/30">
            <Sidebar />
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <main className="flex-1 flex flex-col h-full relative md:ml-64">
                <TopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                {/* Top decorative gradient - simpler for chat feel */}
                <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#050505] to-transparent z-10 pointer-events-none" />

                <div className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className="max-w-4xl mx-auto w-full px-6 pt-20 pb-40">
                        {tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 relative">
                                {/* Background Glow */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                                <div className="relative group">
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                                    <div className="relative w-24 h-24 rounded-2xl bg-[#1e1e1e] border border-white/10 flex items-center justify-center shadow-2xl mb-4 group-hover:scale-105 transition-transform duration-500">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-inner"></div>
                                    </div>
                                </div>

                                <div className="space-y-4 max-w-lg z-10">
                                    <h1 className="text-5xl font-bold bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent tracking-tight">
                                        Good Evening
                                    </h1>
                                    <p className="text-xl text-neutral-400 font-medium leading-relaxed">
                                        Your orbit is clear. Ready to launch?
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <header className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                        Current Mission Link
                                    </h2>
                                    <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-neutral-400 border border-white/5">
                                        {tasks.length} Orbitals
                                    </span>
                                </header>
                                <TaskList tasks={tasks.filter(t => !t.completed)} onToggle={toggleTask} onDelete={deleteTask} />

                                {completedCount > 0 && (
                                    <div className="pt-8 border-t border-white/5">
                                        <h2 className="text-lg font-medium text-neutral-500 mb-4 flex items-center gap-2">
                                            <span>Mission Log</span>
                                            <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full">{completedCount}</span>
                                        </h2>
                                        <TaskList tasks={tasks.filter(t => t.completed)} onToggle={toggleTask} onDelete={deleteTask} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <TaskInput onAddTask={addTask} />
            </main>
        </div>
    );
}
