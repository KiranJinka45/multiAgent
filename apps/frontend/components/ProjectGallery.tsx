'use client';

import { useState } from 'react';
import { FolderPlus, Plus, Search, Calendar, Palette, Layout, Code, Terminal, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { projectService } from '@services/project-service';
import { Project } from '@shared-types/project';
import { toast } from 'sonner';
import { formatDate } from '@config/date';

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

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this project?')) {
            const success = await projectService.deleteProject(id);
            if (success) {
                setProjects(prev => prev.filter(p => p.id !== id));
                toast.success('Project deleted');
            } else {
                toast.error('Failed to delete project');
            }
        }
    };

    const handleRename = async (e: React.MouseEvent, id: string, currentName: string) => {
        e.stopPropagation();
        const newName = window.prompt('Enter new project name:', currentName);
        if (newName && newName !== currentName) {
            const { data } = await projectService.updateProject(id, { name: newName });
            if (data) {
                setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
                toast.success('Project renamed');
            } else {
                toast.error('Failed to rename project');
            }
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

    console.log('[ProjectGallery] Projects:', projects.length, 'Filtered:', filteredProjects.length);

    return (
        <div className="flex-1 overflow-auto p-8">
            <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-primary/10 rounded-[2rem] text-primary glow-primary">
                        <FolderPlus size={28} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-foreground">Missions</h1>
                        <p className="text-sm text-muted-foreground font-medium">Manage and organize your autonomous builds</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Find a mission..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 pr-4 py-3 bg-accent/30 border border-border/50 rounded-2xl text-sm focus:ring-4 focus:ring-primary/10 transition-all w-72 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleCreateProject}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-xl shadow-primary/20 active:scale-95"
                    >
                        <Plus size={18} /> New Mission
                    </button>
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-accent/5 rounded-[3rem] border-2 border-dashed border-border/30">
                    <div className="p-6 bg-accent/10 rounded-full mb-6">
                        <Layout className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">No Missions Found</h3>
                    <p className="text-muted-foreground mt-2 max-w-xs text-center">
                        {searchQuery ? "Try a different search term or create a new mission." : "Start your journey by creating your first autonomous build."}
                    </p>
                    <button
                        onClick={handleCreateProject}
                        className="mt-8 px-8 py-3 bg-foreground text-background rounded-2xl font-bold hover:scale-105 transition-transform"
                    >
                        Create Your First Mission
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                    {filteredProjects.map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="group p-8 glass-card rounded-[2.5rem] hover:shadow-primary/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex justify-between items-start mb-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${getProjectColor(project.name)}`}>
                                    {getProjectIcon(project.project_type, project.name)}
                                </div>
                                <div className="flex items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleRename(e, project.id, project.name)}
                                        className="px-2 py-1 hover:bg-accent rounded-xl text-xs font-bold uppercase text-muted-foreground transition-colors"
                                    >
                                        Rename
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, project.id)}
                                        className="px-2 py-1 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase text-red-500 transition-colors"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const { data } = await projectService.updateProject(project.id, { is_public: !project.is_public });
                                            if (data) {
                                                setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_public: !project.is_public } : p));
                                                toast.success(project.is_public ? 'Build Hidden' : 'Build Published!');
                                            }
                                        }}
                                        className={`px-2 py-1 rounded-xl text-xs font-bold uppercase transition-all ${project.is_public ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                                    >
                                        {project.is_public ? 'Public' : 'Publish'}
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
                                    <span>{formatDate(project.created_at)}</span>
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
            )}
        </div>
    );
}
