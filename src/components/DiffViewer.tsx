'use client';

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { X, FileText, ChevronRight, ChevronDown } from 'lucide-react';

export interface FileDiff {
    path: string;
    oldContent: string;
    newContent: string;
    type: 'create' | 'modify' | 'delete';
}

interface DiffViewerProps {
    diffs: FileDiff[];
    onClose: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffs, onClose }) => {
    const [selectedFile, setSelectedFile] = React.useState<string | null>(
        diffs.length > 0 ? diffs[0].path : null
    );

    const activeDiff = diffs.find(d => d.path === selectedFile);

    // Generate a unified-ish diff string for syntax highlighter
    const generateUnifiedDiff = (diff: FileDiff) => {
        const oldLines = diff.oldContent.split('\n');
        const newLines = diff.newContent.split('\n');

        // This is a simplified diff display logic
        if (diff.type === 'create') {
            return newLines.map(line => `+ ${line}`).join('\n');
        }
        if (diff.type === 'delete') {
            return oldLines.map(line => `- ${line}`).join('\n');
        }

        // For modify, we show a basic before/after block
        // In a more advanced version, we'd use a real diff algorithm
        return `// Original: ${diff.path}\n${oldLines.map(l => `- ${l}`).join('\n')}\n\n// New State:\n${newLines.map(l => `+ ${l}`).join('\n')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f1115] border border-white/10 rounded-xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#161b22]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Review Changes</h2>
                            <p className="text-sm text-gray-400">{diffs.length} files modified in this iteration</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 border-r border-white/10 bg-[#0d1117] overflow-y-auto">
                        <div className="p-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Modified Files</p>
                            <div className="space-y-1">
                                {diffs.map((diff) => (
                                    <button
                                        key={diff.path}
                                        onClick={() => setSelectedFile(diff.path)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${selectedFile === diff.path
                                                ? 'bg-blue-500/10 text-blue-400'
                                                : 'text-gray-400 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${diff.type === 'create' ? 'bg-green-500' :
                                                diff.type === 'delete' ? 'bg-red-500' : 'bg-blue-500'
                                            }`} />
                                        <span className="truncate">{diff.path.split('/').pop()}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-[#0d1117] relative">
                        {activeDiff ? (
                            <div className="p-6">
                                <div className="flex items-center gap-2 mb-4 text-xs font-mono text-gray-500 bg-white/5 py-1 px-3 rounded-md w-fit">
                                    <span>{activeDiff.path}</span>
                                    <ChevronRight className="w-3 h-3" />
                                    <span className={
                                        activeDiff.type === 'create' ? 'text-green-500' :
                                            activeDiff.type === 'delete' ? 'text-red-500' : 'text-blue-500'
                                    }>
                                        {activeDiff.type.toUpperCase()}
                                    </span>
                                </div>
                                <div className="rounded-lg overflow-hidden border border-white/5 shadow-inner">
                                    <SyntaxHighlighter
                                        language="diff"
                                        style={vscDarkPlus}
                                        customStyle={{
                                            margin: 0,
                                            padding: '1.5rem',
                                            fontSize: '0.85rem',
                                            backgroundColor: '#161b22',
                                        }}
                                        lineNumberStyle={{ color: '#484f58', minWidth: '2.5em' }}
                                        showLineNumbers={true}
                                    >
                                        {generateUnifiedDiff(activeDiff)}
                                    </SyntaxHighlighter>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <FileText className="w-12 h-12 mb-4 opacity-20" />
                                <p>Select a file to preview changes</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#161b22] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-lg active:scale-95"
                    >
                        Accept & Continue
                    </button>
                </div>
            </div>
        </div>
    );
};
