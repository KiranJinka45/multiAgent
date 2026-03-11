'use client';

import { X, Maximize2, Minimize2, Copy, Check, Edit3, Code2, Eye, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import CodeBlock from './CodeBlock';
import { toast } from 'sonner';

type CanvasProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    contentType: 'code' | 'markdown';
    isGenerating?: boolean;
    language?: string;
};

export default function Canvas({ isOpen, onClose, title, content, contentType, isGenerating, language }: CanvasProps) {
    const [isMaximized, setIsMaximized] = useState(false);
    const [editableContent, setEditableContent] = useState(content);
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<'preview' | 'code'>(contentType === 'code' ? 'code' : 'preview');

    useEffect(() => {
        setEditableContent(content);
        setViewMode(contentType === 'code' ? 'code' : 'preview');
    }, [content, contentType]);

    const handleCopy = () => {
        navigator.clipboard.writeText(editableContent);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 h-full bg-card border-l border-border shadow-2xl z-50 flex flex-col transition-all duration-300 ${isMaximized ? 'w-full' : 'w-full md:w-[30%] xl:w-[30%]'}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {contentType === 'code' ? <Code2 size={20} /> : <FileText size={20} />}
                    </div>
                    <h2 className="font-semibold text-foreground truncate">{title}</h2>
                </div>

                <div className="flex items-center gap-2">
                    {contentType === 'markdown' && (
                        <div className="flex items-center bg-muted rounded-lg p-1 mr-2">
                            <button
                                onClick={() => setViewMode('preview')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                title="Preview"
                            >
                                <Eye size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('code')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'code' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                title="Source"
                            >
                                <Code2 size={16} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy"
                    >
                        {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                    <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors hidden md:block"
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-card relative">
                <div className="max-w-4xl mx-auto p-8 md:p-12">
                    {viewMode === 'preview' && contentType === 'markdown' ? (
                        <div className="prose dark:prose-invert max-w-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <ReactMarkdown
                                components={{
                                    code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                            <CodeBlock
                                                language={match[1]}
                                                value={String(children).replace(/\n$/, '')}
                                                isStreaming={isGenerating}
                                                {...props}
                                            />
                                        ) : (
                                            <code className={`${className} bg-muted rounded px-1.5 py-0.5 text-sm font-mono`} {...props}>
                                                {children}
                                            </code>
                                        );
                                    }
                                }}
                            >
                                {editableContent}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <div className="rounded-xl overflow-hidden border border-border bg-black/5 animate-in fade-in duration-500">
                            <CodeBlock
                                language={language || 'markdown'}
                                value={editableContent}
                                isStreaming={isGenerating}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Footer / Status */}
            <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                    <span>{editableContent.split('\n').length} lines</span>
                    <span>{editableContent.length} characters</span>
                </div>
                <div className="flex items-center gap-2">
                    <Edit3 size={12} />
                    <span>Auto-saving enabled</span>
                </div>
            </div>
        </motion.div>
    );
}


