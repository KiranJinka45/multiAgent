"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder,
    FileCode,
    ChevronRight,
    ChevronDown,
    FileJson,
    FileText,
    Box,
    Globe,
    Lock,
    Search
} from 'lucide-react';

interface FileNode {
    name: string;
    path: string;
    isDir: boolean;
    children: Record<string, FileNode>;
    isNew?: boolean;
}

interface FileExplorerProps {
    files: { path: string; content?: string }[];
    currentStage: string;
    onFileSelect?: (path: string) => void;
    activeFile?: string | null;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files, currentStage, onFileSelect, activeFile }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'src': true, 'app': true });
    const [lastFileCount, setLastFileCount] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Convert flat array to tree
    const tree = useMemo(() => {
        const root: FileNode = { name: 'root', path: '', isDir: true, children: {} };

        files.forEach((file, index) => {
            const parts = file.path.split('/');
            let current = root;

            parts.forEach((part: string, i: number) => {
                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        path: parts.slice(0, i + 1).join('/'),
                        isDir: i < parts.length - 1,
                        children: {},
                        isNew: index >= lastFileCount
                    };
                }
                current = current.children[part];
            });
        });

        return root;
    }, [files, lastFileCount]);

    useEffect(() => {
        if (files.length > lastFileCount) {
            setLastFileCount(files.length);
            const newFile = files[files.length - 1];
            if (newFile) {
                const parts = newFile.path.split('/');
                const newExpanded = { ...expanded };
                let currentPath = '';
                parts.slice(0, -1).forEach((part: string) => {
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    newExpanded[currentPath] = true;
                });
                setExpanded(newExpanded);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files.length, lastFileCount, expanded]);

    const toggleFolder = (path: string) => {
        setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
    };

    const getIcon = (name: string, isDir: boolean) => {
        if (isDir) return <Folder size={14} className="text-primary/70 group-hover:text-primary transition-colors" />;
        const n = name.toLowerCase();
        if (n.endsWith('.tsx') || n.endsWith('.ts')) return <FileCode size={14} className="text-blue-400/80" />;
        if (n.endsWith('.json')) return <FileJson size={14} className="text-yellow-400/80" />;
        if (n.endsWith('.sql')) return <Lock size={14} className="text-purple-400/80" />;
        if (n.includes('docker')) return <Box size={14} className="text-cyan-400/80" />;
        if (n.endsWith('.md')) return <FileText size={14} className="text-gray-400/80" />;
        return <Globe size={14} className="text-green-400/80" />;
    };

    // Determine if a node should have the "active agent" glow based on index/stage logic
    const isNodeActive = (node: FileNode) => {
        const p = node.path.toLowerCase();

        // Strict index mapping would normally use props, but since we rely on currentStage string here:
        if (currentStage.includes('Architecture') || currentStage.includes('Database') || currentStage.includes('schema')) {
            if (p.includes('supabase') || p.includes('schema') || p.endsWith('.sql')) return true;
        }
        else if (currentStage.includes('Backend') || currentStage.includes('API')) {
            if (p.includes('api') || p.includes('server') || p.includes('routes')) return true;
        }
        else if (currentStage.includes('Frontend') || currentStage.includes('UI')) {
            if (p.includes('components') || p.includes('app') || p.includes('ui')) return true;
        }

        return false;
    };

    const renderTree = (node: FileNode, level: number = 0) => {
        const children = Object.values(node.children).sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
        });

        const isActive = isNodeActive(node);

        return (
            <div key={node.path || 'root'}>
                {node.path && (
                    <motion.div
                        initial={node.isNew ? { x: -10, opacity: 0 } : false}
                        animate={{ x: 0, opacity: 1 }}
                        className={`
              flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-white/5 transition-all group relative
              ${isActive ? 'agent-glow-active' : ''}
              ${node.isNew ? 'bg-primary/5' : ''}
            `}
                        style={{ paddingLeft: `${level * 12 + 16}px` }}
                        onClick={() => {
                            if (node.isDir) {
                                toggleFolder(node.path);
                            } else if (onFileSelect) {
                                onFileSelect(node.path);
                            }
                        }}
                    >
                        {/* Active Path Visualizer */}
                        {(isActive || activeFile === node.path) && (
                            <motion.div
                                layoutId="active-indicator"
                                className="absolute left-0 w-0.5 h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                            />
                        )}

                        <span className="text-gray-600 group-hover:text-gray-400 transition-colors">
                            {node.isDir ? (
                                expanded[node.path] ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                            ) : (
                                <div className="w-3" />
                            )}
                        </span>
                        {getIcon(node.name, node.isDir)}
                        <span className={`text-[11px] truncate tracking-tight transition-colors ${node.isDir ? 'font-bold text-gray-300 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-200'} ${(isActive || activeFile === node.path) ? 'text-primary' : ''}`}>
                            {node.name}
                        </span>

                        {node.isNew && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                            />
                        )}
                    </motion.div>
                )}

                <AnimatePresence>
                    {(expanded[node.path] || !node.path) && children.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-white/[0.01]"
                        >
                            {children.map(child => renderTree(child, level + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="h-10 px-4 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]">
                <span className="text-[10px] font-black tracking-widest uppercase text-white/30">Filesystem</span>
                <div className="flex items-center gap-2">
                    <Search size={12} className="text-white/20" />
                    <span className="text-[9px] text-white/20 font-mono">CMD+P</span>
                </div>
            </div>
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar py-2"
            >
                {renderTree(tree)}
                {files.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-20">
                        <div className="w-12 h-12 rounded-full border border-dashed border-white/20 mb-4 animate-spin-slow" />
                        <p className="text-[10px] font-medium tracking-tight">Initializing virtual workspace...</p>
                    </div>
                )}
            </div>
            <div className="p-3 border-t border-white/5 bg-[#0a0a0a]/50">
                <div className="flex items-center justify-between text-[9px] font-mono text-white/30 uppercase tracking-tighter">
                    <span>Total Objects</span>
                    <span className="text-primary font-bold">{files.length}</span>
                </div>
            </div>
        </div>
    );
};

export default React.memo(FileExplorer);
