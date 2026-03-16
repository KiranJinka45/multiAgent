'use client';

import TopNav from '@/components/TopNav';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MobileMenu from '@/components/MobileMenu';
import TaskInput from '@/components/TaskInput';
import TaskList, { Task } from '@/components/TaskList';
import { ListTodo } from 'lucide-react';

export default function MyTasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const addTask = (title: string) => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            completed: false,
            createdAt: new Date().toISOString(),
        };
        setTasks([newTask, ...tasks]);
    };

    const toggleTask = (id: string) => {
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));
    };

    const deleteTask = (id: string) => {
        setTasks(tasks.filter(task => task.id !== id));
    };

    const pendingTasks = tasks.filter(t => !t.completed);

    return (
        <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-blue-500/30">
            <Sidebar />
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <main className="flex-1 flex flex-col h-full relative md:ml-64">
                <TopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#050505] to-transparent z-10 pointer-events-none" />

                <div className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className="max-w-4xl mx-auto w-full px-6 pt-20 pb-40">
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <header className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <ListTodo className="text-blue-500" />
                                    My Tasks
                                </h2>
                                <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-neutral-400 border border-white/5">
                                    {pendingTasks.length} Pending
                                </span>
                            </header>

                            {pendingTasks.length === 0 ? (
                                <div className="text-center py-20 text-neutral-500">
                                    <p>No pending tasks. You&apos;re all caught up!</p>
                                </div>
                            ) : (
                                <TaskList tasks={pendingTasks} onToggle={toggleTask} onDelete={deleteTask} />
                            )}
                        </div>
                    </div>
                </div>

                <TaskInput onAddTask={addTask} />
            </main>
        </div>
    );
}
