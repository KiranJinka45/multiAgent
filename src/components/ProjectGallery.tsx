'use client';

import { useState } from 'react';
import { FolderPlus, Plus, Search, MoreHorizontal, Calendar, Palette, Layout, Code, Terminal, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { projectService } from '@/lib/project-service';
import { Project } from '@/types/project';
import { toast } from 'sonner';

interface ProjectGalleryProps {
    initialProjects: Project[];
}

export default function ProjectGallery({ initialProjects }: ProjectGalleryProps) {
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    const handleCreateProject = async () => {
        const name = prompt("Enter project name:");
        if (!name) return;

        // Optimistic UI: Open editor immediately
        toast.success("Initializing engine... Opening editor instantly.", { icon: '⚡' });

        // We push to the route immediately - the page will handle the 'draft' or 'not found' state
        // but since we're optimizing, we'll actually create it first to get the REAL ID
        // To be truly optimistic and instant, we'd need a way to pass the name/prompt to the editor
        // Let's stick to rapid creation for now.

        const { data: project } = await projectService.createProject(name, "Initiated by MultiAgent AI", "application");
        if (project) {
            setProjects(prev => [project, ...prev]);
            router.push(`/projects/${project.id}`);
        } else {
            toast.error("Failed to create project");
        }
    };

    const getProjectIcon = (project_type?: string | null, name?: string) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('design') || n.includes('ui') || n.includes('style')) return <Palette size={20} />;
        if (n.includes('page') || n.includes('web') || n.includes('landing')) return <Layout size={20} />;
        if (n.includes('api') || n.includes('server') || n.includes('backend')) return <Terminal size={20} />;
        return <Code size={20} />;
    };

    const getProjectColor = (name?: string) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('design') || n.includes('ui')) return 'bg-pink-500/10 text-pink-500';
        if (n.includes('page') || n.includes('web')) return 'bg-blue-500/10 text-blue-500';
        if (n.includes('api') || n.includes('server')) return 'bg-orange-500/10 text-orange-500';
        return 'bg-indigo-500/10 text-indigo-500';
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-auto p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <FolderPlus size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
                        <p className="text-sm text-muted-foreground">Manage and organize your multi-step missions</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-accent/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all w-64 underline-none outline-none"
                        />
                    </div>
                    <button
                        onClick={handleCreateProject}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                    >
                        <Plus size={16} /> New Project
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                {filteredProjects.map((project, index) => (
                    <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="group p-6 bg-card border border-border rounded-3xl hover:shadow-2xl hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex justify-between items-start mb-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${getProjectColor(project.name)}`}>
                                {getProjectIcon(project.project_type, project.name)}
                            </div>
                            <div className="flex items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-colors">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 flex-1">
                            <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors flex items-center gap-2">
                                {project.name}
                                {project.status === 'completed' && <Sparkles size={16} className="text-yellow-500" />}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed font-medium">{project.description || 'Professional project.'}</p>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 pt-6 mt-6 border-t border-border/40">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${project.status === 'completed' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : project.status === 'failed' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,44,44,0.5)]' : 'bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
                                <span className={project.status === 'completed' ? 'text-green-600' : ''}>{project.status}</span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                                <Calendar size={12} className="opacity-50" />
                                <span>{new Date(project.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}

                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleCreateProject}
                    className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-border rounded-3xl text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent/5 transition-all text-sm font-bold min-h-[220px] group"
                >
                    <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <Plus size={28} />
                    </div>
                    Start Build
                </motion.button>
            </div>
        </div>
    );
}
