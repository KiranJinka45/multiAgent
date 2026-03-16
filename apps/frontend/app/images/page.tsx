'use client';

import { Image as ImageIcon, Download, Share2, Filter, Sparkles, Plus, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Sidebar from '@components/Sidebar';
import { toast } from 'sonner';

interface GeneratedImage {
    id: string;
    prompt: string;
    url: string;
    model: string;
    created_at: string;
}

export default function ImagesPage() {
    const [images, setImages] = useState<GeneratedImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [prompt, setPrompt] = useState('');

    useEffect(() => {
        fetchImages();
    }, []);

    const fetchImages = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/images');
            if (!res.ok) throw new Error('Failed to fetch images');
            const data = await res.json();
            setImages(data.images || []);
        } catch (error) {
            toast.error('Could not load your image gallery');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isGenerating) return;

        setIsGenerating(true);
        const currentPrompt = prompt;
        setPrompt('');
        setIsModalOpen(false);
        
        const loadingId = toast.loading('Initializing Neural Canvas...', { description: currentPrompt });

        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: currentPrompt })
            });

            if (!res.ok) throw new Error('Generation failed');
            
            const data = await res.json();
            
            toast.dismiss(loadingId);
            toast.success('Asset generated successfully!', { icon: '✨' });
            
            // Optimistically add to top of gallery
            if (data.dbRecord) {
                setImages(prev => [data.dbRecord, ...prev]);
            } else {
                fetchImages(); // Fallback to full refresh
            }

        } catch (error) {
            toast.dismiss(loadingId);
            toast.error('Generation Error', { description: 'The AI canvas is currently unavailable' });
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async (url: string, id: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `multiagent-asset-${id.slice(0, 8)}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch {
            toast.error('Failed to download image');
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground animate-in fade-in duration-500 overflow-hidden">
            <Sidebar />
            <main
                className="flex-1 flex flex-col h-full relative transition-[margin] duration-300 ease-in-out"
                style={{ marginLeft: 'var(--sidebar-width, 260px)' }}
            >
                {/* Header */}
                <header className="flex items-center justify-between px-8 py-6 border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-10 w-full shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                            <ImageIcon size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Generated Images</h1>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                Gallery of your AI-generated assets
                                {isGenerating && <Loader2 size={12} className="animate-spin text-purple-500" />}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                            <Filter size={20} />
                        </button>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors shadow-[0_4px_14px_0_rgb(168,85,247,39%)] hover:shadow-[0_6px_20px_rgba(168,85,247,23%)] hover:-translate-y-0.5"
                        >
                            <Sparkles size={16} /> Generate New
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8 custom-scrollbar relative">
                    {/* Background glows */}
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] pointer-events-none" />

                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 text-muted-foreground space-y-4 flex-col">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                            <p className="text-sm font-medium tracking-widest uppercase">Connecting to Database...</p>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto space-y-6">
                            <div className="w-24 h-24 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-center shadow-2xl relative group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                                <ImageIcon size={40} className="text-white/20 group-hover:text-purple-400 transition-colors relative z-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold tracking-tight text-white">Empty Canvas</h2>
                                <p className="text-muted-foreground text-sm">You haven&apos;t generated any assets yet. Open the AI Prompt to bring your ideas to life.</p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95 text-white"
                            >
                                <Plus size={16} /> Create First Image
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
                            <AnimatePresence>
                                {images.map((img, idx) => (
                                    <motion.div
                                        layout
                                        key={img.id}
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group relative rounded-2xl overflow-hidden bg-white/[0.02] border border-white/5 shadow-xl hover:shadow-2xl hover:border-purple-500/30 transition-all duration-300"
                                    >
                                        <div className="aspect-square w-full bg-neutral-900 relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={img.url} 
                                                alt={img.prompt}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                        </div>
                                        {/* Overlay */}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                            <p className="text-white text-sm font-medium line-clamp-2 mb-3 drop-shadow-md">{img.prompt}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-purple-300 font-bold tracking-wider uppercase bg-purple-500/20 px-2 py-1 rounded border border-purple-500/20">{img.model}</span>
                                                <div className="flex gap-2 relative z-20">
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(img.url, img.id); }}
                                                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-md"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(img.url); toast.success('URL copied to clipboard'); }}
                                                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-md"
                                                    >
                                                        <Share2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Generation Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => !isGenerating && setIsModalOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                                
                                <div className="p-6 relative">
                                    <button 
                                        onClick={() => !isGenerating && setIsModalOpen(false)}
                                        className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors disabled:opacity-50"
                                        disabled={isGenerating}
                                    >
                                        <X size={20} />
                                    </button>
                                    
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Neural Canvas</h2>
                                            <p className="text-xs text-white/40 font-medium">Render assets via text-to-image engine</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleGenerate} className="space-y-4">
                                        <div>
                                            <textarea
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                placeholder="Describe the image you want to generate in detail (e.g., 'A cyberpunk city street at night with neon lights, 4k resolution, cinematic lighting')"
                                                className="w-full h-32 bg-black border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none placeholder:text-white/20 custom-scrollbar"
                                                disabled={isGenerating}
                                                autoFocus
                                            />
                                        </div>
                                        
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button 
                                                type="button"
                                                onClick={() => setIsModalOpen(false)}
                                                className="px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white transition-colors disabled:opacity-50"
                                                disabled={isGenerating}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit"
                                                disabled={!prompt.trim() || isGenerating}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold tracking-wide hover:bg-purple-500 transition-all disabled:opacity-50 disabled:hover:bg-purple-600 shadow-lg shadow-purple-500/20"
                                            >
                                                {isGenerating ? (
                                                    <><Loader2 size={16} className="animate-spin" /> Rendering...</>
                                                ) : (
                                                    <><Sparkles size={16} /> Generate Asset</>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

