'use client';

import { FolderPlus, Plus, Search, MoreHorizontal, Calendar, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';

export default function ProjectsPage() {
    return (
        <div className="flex h-screen bg-background text-foreground animate-in fade-in duration-500 overflow-hidden">
            <Sidebar />
            <main
                className="flex-1 flex flex-col h-full relative transition-[margin] duration-300 ease-in-out"
                style={{ marginLeft: 'var(--sidebar-width, 260px)' }}
            >
                {/* Header */}
                <header className="flex items-center justify-between px-8 py-6 border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-10 w-full">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                            <FolderPlus size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                            <p className="text-sm text-muted-foreground">Manage and organize your multi-step missions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="pl-9 pr-4 py-2 bg-accent/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all w-64"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                            <Plus size={16} /> New Project
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8">
                    {/* Empty State / Placeholder Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Example Project Card 1 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="group p-5 bg-card border border-border rounded-2xl hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <FolderPlus size={20} />
                                </div>
                                <button className="text-muted-foreground hover:text-foreground transition-colors">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>
                            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">Website Redesign</h3>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">Overhaul the corporate website with new branding guidelines and improved SEO structure.</p>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-4 border-t border-border/50">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={12} />
                                    <span>Due Oct 24</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users size={12} />
                                    <span>3 members</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Example Project Card 2 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="group p-5 bg-card border border-border rounded-2xl hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <FolderPlus size={20} />
                                </div>
                                <button className="text-muted-foreground hover:text-foreground transition-colors">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>
                            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">Q4 Marketing Campaign</h3>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">Plan and execute the holiday season marketing blitz across social media and email channels.</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-4 border-t border-border/50">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={12} />
                                    <span>Due Nov 15</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users size={12} />
                                    <span>5 members</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Add New Project Placeholder */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col items-center justify-center gap-3 p-5 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent/5 transition-all text-sm font-medium h-full min-h-[200px]"
                        >
                            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                                <Plus size={24} />
                            </div>
                            Create New Project
                        </motion.button>
                    </div>
                </div>
            </main>
        </div>
    );
}
