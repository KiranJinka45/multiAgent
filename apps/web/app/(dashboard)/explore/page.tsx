'use client';

import { useState, useEffect } from 'react';
import { Compass, Search, Layout, Globe, ArrowUpRight, Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import TopNav from '@/components/TopNav';
import MobileMenu from '@/components/MobileMenu';
import { Project } from '@libs/contracts';
import { formatDate } from '@libs/utils';

export default function ExplorePage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'builds' | 'templates' | 'plugins'>('builds');
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchMarketplace = async () => {
            setLoading(true);
            try {
                const endpoint = activeTab === 'builds' ? '/api/public-showcase' : `/api/marketplace/${activeTab}`;
                const res = await fetch(endpoint);
                const data = await res.json();
                if (data.projects) setProjects(data.projects);
                else if (data.items) setProjects(data.items);
                else setProjects([]);
            } catch (error) {
                console.error(`Failed to fetch ${activeTab}:`, error);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };
        fetchMarketplace();
    }, [activeTab]);

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
            
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div
                className="flex-1 flex flex-col h-full relative"
            >
                <TopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

                <div className="flex-1 overflow-y-auto px-6 pt-24 pb-12">
                    <div className="max-w-7xl mx-auto space-y-12">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                                        <Compass size={24} />
                                    </div>
                                    <h1 className="text-4xl font-black tracking-tighter">Marketplace</h1>
                                </div>
                                <p className="text-lg text-muted-foreground max-w-xl font-medium leading-relaxed">
                                    Extend your workflow with curated <span className="text-white">templates</span>, community <span className="text-white">builds</span>, and professional <span className="text-white">plugins</span>.
                                </p>
                            </div>

                            <div className="flex p-1 bg-accent/30 rounded-2xl border border-border/50">
                                {(['builds', 'templates', 'plugins'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="relative group w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder={`Search ${activeTab}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-accent/30 border border-border/50 rounded-2xl text-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                />
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-xs font-bold uppercase tracking-wider">
                                    <Globe size={12} />
                                    <span>{projects.length} Public Builds</span>
                                </div>
                            </div>
                        </div>

                        {/* Projects Grid */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="h-64 bg-accent/20 rounded-3xl animate-pulse" />
                                ))}
                            </div>
                        ) : filteredProjects.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                                {filteredProjects.map((project, index) => (
                                    <motion.div
                                        key={project.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => router.push(`/share/${project.id}`)}
                                        className="group relative bg-card border border-border/50 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer"
                                    >
                                        {/* Mockup Preview Area */}
                                        <div className="aspect-video bg-accent/50 relative overflow-hidden">
                                            {project.thumbnail_url ? (
                                                <img src={project.thumbnail_url} alt={project.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-transparent">
                                                     <Layout size={48} className="text-primary/20" />
                                                </div>
                                            )}
                                            
                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <button className="px-5 py-2.5 bg-white text-black rounded-full font-bold text-sm flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                                    Preview Build <ArrowUpRight size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); router.push(`/?prompt=Remix: ${project.name}`); }}
                                                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-bold text-sm flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform delay-75"
                                                >
                                                    Remix <RefreshCw size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
                                                        {project.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                        <span>{formatDate(project.created_at)}</span>
                                                        <span className="w-1 h-1 bg-border rounded-full" />
                                                        <span className="capitalize">{project.project_type || 'App'}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2 bg-accent/50 rounded-lg">
                                                    <Zap size={16} className="text-yellow-500" />
                                                </div>
                                            </div>
                                            
                                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                {project.description || 'Built with MultiAgent autonomous grid.'}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center">
                                    <Globe size={40} className="text-muted-foreground/30" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold">The grid is calm...</h2>
                                    <p className="text-muted-foreground">Try a different search or be the first to publish a build!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom decorative gradient */}
                <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
            </div>
        </div>
    );
}



