import React, { useMemo } from 'react';
import {
    FileCode, FileJson, FileText, Globe, Box, Lock
} from 'lucide-react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';

// Register languages
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('markdown', markdown);

interface FileViewerProps {
    file: { path: string; content?: string } | null;
}

export default function FileViewer({ file }: FileViewerProps) {

    const language = useMemo(() => {
        if (!file) return 'text';
        const p = file.path.toLowerCase();
        if (p.endsWith('.tsx')) return 'tsx';
        if (p.endsWith('.ts')) return 'typescript';
        if (p.endsWith('.jsx')) return 'jsx';
        if (p.endsWith('.js')) return 'javascript';
        if (p.endsWith('.css')) return 'css';
        if (p.endsWith('.sql')) return 'sql';
        if (p.endsWith('.json')) return 'json';
        if (p.endsWith('.sh')) return 'bash';
        if (p.endsWith('.md')) return 'markdown';
        return 'text';
    }, [file]);

    const getIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.endsWith('.tsx') || n.endsWith('.ts') || n.endsWith('.js')) return <FileCode size={14} className="text-blue-400" />;
        if (n.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" />;
        if (n.endsWith('.sql')) return <Lock size={14} className="text-purple-400" />;
        if (n.includes('docker')) return <Box size={14} className="text-cyan-400" />;
        if (n.endsWith('.md')) return <FileText size={14} className="text-gray-400" />;
        return <Globe size={14} className="text-green-400" />;
    };

    if (!file) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/20 font-mono text-sm tracking-widest uppercase bg-[#080808]">
                <FileCode size={48} className="mb-4 opacity-10" />
                Select a file to inspect contents
            </div>
        );
    }

    const fileName = file.path.split('/').pop() || file.path;

    return (
        <div className="flex flex-col h-full bg-[#080808] overflow-hidden">
            {/* Header */}
            <div className="h-10 px-4 border-b border-white/5 flex items-center gap-2 bg-[#0a0a0a]">
                {getIcon(fileName)}
                <span className="text-[12px] font-mono text-gray-300">{fileName}</span>
                <span className="ml-2 text-[10px] text-white/20 uppercase tracking-widest">{language}</span>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="absolute inset-0">
                    <SyntaxHighlighter
                        language={language}
                        style={vscDarkPlus}
                        customStyle={{
                            margin: 0,
                            padding: '1rem',
                            background: 'transparent',
                            fontSize: '12px',
                            lineHeight: '1.6',
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            minHeight: '100%'
                        }}
                        showLineNumbers={true}
                        lineNumberStyle={{
                            minWidth: '3.5em',
                            paddingRight: '1em',
                            color: 'rgba(255,255,255,0.2)',
                            textAlign: 'right',
                            userSelect: 'none'
                        }}
                    >
                        {file.content || '// Content unavailable'}
                    </SyntaxHighlighter>
                </div>
            </div>
        </div>
    );
}
