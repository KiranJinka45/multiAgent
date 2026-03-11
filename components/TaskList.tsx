
'use client';

import { Check, Trash2, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import ReactMarkdown from 'react-markdown';

export type Task = {
    id: string;
    title: string;
    completed: boolean;
    createdAt: string;
    isAi?: boolean;
};

type TaskListProps = {
    tasks: Task[];
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
};

export default function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/30">
                <Clock size={48} className="mb-4 text-neutral-600" />
                <p className="text-lg font-medium text-neutral-400">No tasks yet</p>
                <p className="text-sm">Add a task to get started on your productivity journey.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <AnimatePresence initial={false} mode='popLayout'>
                {tasks.map((task) => (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        key={task.id}
                        className={`group flex items-start p-4 rounded-xl transition-colors duration-200 ${task.isAi
                            ? 'bg-[#1e1e1e] border border-blue-500/20 shadow-lg shadow-blue-500/5'
                            : task.completed
                                ? 'opacity-50'
                                : 'hover:bg-[#1a1a1a]'
                            }`}
                    >
                        {!task.isAi && (
                            <button
                                onClick={() => onToggle(task.id)}
                                className={`w-5 h-5 mt-1 rounded border flex items-center justify-center mr-4 transition-all duration-200 shrink-0 ${task.completed
                                    ? 'bg-neutral-500 border-neutral-500 text-black'
                                    : 'border-neutral-600 hover:border-neutral-400 hover:bg-neutral-800'
                                    }`}
                            >
                                {task.completed && <Check size={14} strokeWidth={3} />}
                            </button>
                        )}

                        {task.isAi && (
                            <div className="mr-4 mt-1 text-blue-400 shrink-0">
                                <Sparkles size={18} />
                            </div>
                        )}

                        <div className="flex-1 min-w-0 overflow-hidden">
                            <div className={`text-base ${task.isAi ? 'text-neutral-200 prose prose-invert max-w-none prose-sm' : task.completed ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>
                                {task.isAi ? (
                                    <ReactMarkdown>{task.title}</ReactMarkdown>
                                ) : (
                                    task.title
                                )}
                            </div>
                            {!task.isAi && (
                                <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600">
                                    <span>Today</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => onDelete(task.id)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                            <Trash2 size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
