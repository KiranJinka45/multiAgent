'use client';

import { Image as ImageIcon, Download, Share2, MoreHorizontal, Filter, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';

export default function ImagesPage() {
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
                        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                            <ImageIcon size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Generated Images</h1>
                            <p className="text-sm text-muted-foreground">Gallery of your AI-generated assets</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                            <Filter size={20} />
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/20">
                            <Sparkles size={16} /> Generate New
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8">
                    {/* Placeholder Masonry Grid */}
                    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">

                        {/* Example Image 1 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group relative rounded-2xl overflow-hidden bg-accent/20 break-inside-avoid"
                        >
                            <div className="aspect-[3/4] bg-neutral-800 w-full flex items-center justify-center text-neutral-700">
                                <span className="text-xs font-mono">Image Placeholder 3:4</span>
                            </div>
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <p className="text-white text-sm font-medium line-clamp-1 mb-2">Cyberpunk city street at night with neon lights</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-white/60 bg-white/10 px-2 py-1 rounded">Try v4</span>
                                    <div className="flex gap-2">
                                        <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                                            <Download size={14} />
                                        </button>
                                        <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Example Image 2 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="group relative rounded-2xl overflow-hidden bg-accent/20 break-inside-avoid"
                        >
                            <div className="aspect-video bg-neutral-800 w-full flex items-center justify-center text-neutral-700">
                                <span className="text-xs font-mono">Image Placeholder 16:9</span>
                            </div>
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <p className="text-white text-sm font-medium line-clamp-1 mb-2">Modern minimalist office setup</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-white/60 bg-white/10 px-2 py-1 rounded">Flux 1.0</span>
                                    <div className="flex gap-2">
                                        <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                                            <Download size={14} />
                                        </button>
                                        <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Example Image 3 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="group relative rounded-2xl overflow-hidden bg-accent/20 break-inside-avoid"
                        >
                            <div className="aspect-square bg-neutral-800 w-full flex items-center justify-center text-neutral-700">
                                <span className="text-xs font-mono">Image Placeholder 1:1</span>
                            </div>
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <p className="text-white text-sm font-medium line-clamp-1 mb-2">Abstract 3D geometric shapes</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-white/60 bg-white/10 px-2 py-1 rounded">Midjourney</span>
                                    <div className="flex gap-2">
                                        <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                                            <Download size={14} />
                                        </button>
                                        <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </main>
        </div>
    );
}
