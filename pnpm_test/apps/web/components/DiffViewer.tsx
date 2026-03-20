'use client';

import React, { useState, useCallback } from 'react';
import { diffLines, Change } from 'diff';
import {
    X,
    FileText,
    ChevronRight,
    Check,
    AlertCircle,
    Loader2,
    CheckCheck,
    FilePlus,
    FileX,
    FilePen,
} from 'lucide-react';

export interface FileDiff {
    path: string;
    oldContent: string;
    newContent: string;
    type: 'create' | 'modify' | 'delete';
}

type ApplyStatus = 'idle' | 'applying' | 'applied' | 'error';

interface DiffViewerProps {
    diffs: FileDiff[];
    onClose: () => void;
    /** Optional: if provided, "Apply" buttons will appear */
    onApply?: (diff: FileDiff) => Promise<void>;
}

function TypeIcon({ type }: { type: FileDiff['type'] }) {
    if (type === 'create') return <FilePlus className="w-3.5 h-3.5 text-green-400" />;
    if (type === 'delete') return <FileX className="w-3.5 h-3.5 text-red-400" />;
    return <FilePen className="w-3.5 h-3.5 text-blue-400" />;
}

function typeBadgeStyle(type: FileDiff['type']) {
    if (type === 'create') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (type === 'delete') return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
}

/** Renders a unified diff hunk using diffLines() for accuracy */
function UnifiedDiffBlock({ diff }: { diff: FileDiff }) {
    let changes: Change[];
    if (diff.type === 'create') {
        changes = [{ value: diff.newContent, added: true, removed: false, count: diff.newContent.split('\n').length }];
    } else if (diff.type === 'delete') {
        changes = [{ value: diff.oldContent, added: false, removed: true, count: diff.oldContent.split('\n').length }];
    } else {
        changes = diffLines(diff.oldContent, diff.newContent);
    }

    let oldLineNo = 1;
    let newLineNo = 1;

    return (
        <div className="font-mono text-[12px] leading-5 overflow-x-auto">
            {changes.map((change, ci) => {
                const lines = change.value.split('\n');
                // remove trailing empty element from final newline
                if (lines[lines.length - 1] === '') lines.pop();

                return lines.map((line, li) => {
                    let prefix = ' ';
                    let rowClass = 'text-gray-400';
                    let oldNum: number | string = '';
                    let newNum: number | string = '';

                    if (change.added) {
                        prefix = '+';
                        rowClass = 'bg-green-900/25 text-green-300';
                        newNum = newLineNo++;
                    } else if (change.removed) {
                        prefix = '-';
                        rowClass = 'bg-red-900/25 text-red-300';
                        oldNum = oldLineNo++;
                    } else {
                        oldNum = oldLineNo++;
                        newNum = newLineNo++;
                    }

                    return (
                        <div key={`${ci}-${li}`} className={`flex items-start gap-0 ${rowClass}`}>
                            <span className="select-none w-10 shrink-0 text-right pr-2 text-gray-600 border-r border-white/5">
                                {oldNum}
                            </span>
                            <span className="select-none w-10 shrink-0 text-right pr-2 text-gray-600 border-r border-white/5">
                                {newNum}
                            </span>
                            <span className="select-none w-5 shrink-0 text-center text-gray-500">{prefix}</span>
                            <span className="pl-2 whitespace-pre break-all">{line || ' '}</span>
                        </div>
                    );
                });
            })}
        </div>
    );
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffs, onClose, onApply }) => {
    const [selectedFile, setSelectedFile] = useState<string | null>(
        diffs.length > 0 ? diffs[0].path : null
    );
    const [applyStatus, setApplyStatus] = useState<Record<string, ApplyStatus>>({});
    const [applyAllRunning, setApplyAllRunning] = useState(false);

    const activeDiff = diffs.find(d => d.path === selectedFile);

    const handleApply = useCallback(async (diff: FileDiff) => {
        if (!onApply) return;
        setApplyStatus(prev => ({ ...prev, [diff.path]: 'applying' }));
        try {
            await onApply(diff);
            setApplyStatus(prev => ({ ...prev, [diff.path]: 'applied' }));
        } catch {
            setApplyStatus(prev => ({ ...prev, [diff.path]: 'error' }));
        }
    }, [onApply]);

    const handleApplyAll = useCallback(async () => {
        if (!onApply || applyAllRunning) return;
        setApplyAllRunning(true);
        for (const diff of diffs) {
            if (applyStatus[diff.path] === 'applied') continue;
            await handleApply(diff);
        }
        setApplyAllRunning(false);
    }, [onApply, applyAllRunning, diffs, applyStatus, handleApply]);

    const allApplied = diffs.every(d => applyStatus[d.path] === 'applied');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <div className="bg-[#0d1117] border border-white/10 rounded-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/[0.07] bg-[#161b22] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/15 rounded-lg border border-blue-500/20">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white tracking-tight">Review Changes</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {diffs.length} file{diffs.length !== 1 ? 's' : ''} modified — review and apply individually or all at once
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 border-r border-white/[0.07] bg-[#0a0d13] overflow-y-auto shrink-0">
                        <div className="p-3">
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 px-2">
                                Modified Files
                            </p>
                            <div className="space-y-0.5">
                                {diffs.map((diff) => {
                                    const status = applyStatus[diff.path] || 'idle';
                                    return (
                                        <div key={diff.path} className="flex items-center gap-1">
                                            <button
                                                onClick={() => setSelectedFile(diff.path)}
                                                className={`flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all ${selectedFile === diff.path
                                                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/15'
                                                        : 'text-gray-400 hover:bg-white/5 border border-transparent'
                                                    }`}
                                            >
                                                <TypeIcon type={diff.type} />
                                                <span className="truncate flex-1 text-left text-[11px]">
                                                    {diff.path.split('/').pop()}
                                                </span>
                                                {status === 'applying' && <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />}
                                                {status === 'applied' && <Check className="w-3 h-3 text-green-400 shrink-0" />}
                                                {status === 'error' && <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />}
                                            </button>
                                            {onApply && status !== 'applied' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleApply(diff); }}
                                                    disabled={status === 'applying'}
                                                    className="shrink-0 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Apply this file"
                                                >
                                                    {status === 'applying' ? '…' : 'Apply'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Diff content */}
                    <div className="flex-1 overflow-y-auto bg-[#0d1117]">
                        {activeDiff ? (
                            <div className="p-5">
                                {/* File path bar */}
                                <div className="flex items-center gap-2 mb-4 flex-wrap">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md border border-white/[0.07] text-xs font-mono text-gray-500">
                                        <TypeIcon type={activeDiff.type} />
                                        <span className="text-gray-400">{activeDiff.path}</span>
                                        <ChevronRight className="w-3 h-3 opacity-40" />
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${typeBadgeStyle(activeDiff.type)}`}>
                                            {activeDiff.type}
                                        </span>
                                    </div>
                                    {/* Per-file apply button in the content area too */}
                                    {onApply && (applyStatus[activeDiff.path] || 'idle') !== 'applied' && (
                                        <button
                                            onClick={() => handleApply(activeDiff)}
                                            disabled={applyStatus[activeDiff.path] === 'applying'}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-600/80 hover:bg-blue-500 text-white transition-all disabled:opacity-50 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                        >
                                            {applyStatus[activeDiff.path] === 'applying'
                                                ? <><Loader2 className="w-3 h-3 animate-spin" /> Applying…</>
                                                : <><Check className="w-3 h-3" /> Apply File</>}
                                        </button>
                                    )}
                                    {(applyStatus[activeDiff.path] === 'applied') && (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20">
                                            <Check className="w-3 h-3" /> Applied
                                        </span>
                                    )}
                                    {(applyStatus[activeDiff.path] === 'error') && (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20">
                                            <AlertCircle className="w-3 h-3" /> Apply Failed
                                        </span>
                                    )}
                                </div>

                                {/* Diff block */}
                                <div className="rounded-lg overflow-hidden border border-white/[0.07] shadow-inner bg-[#161b22]">
                                    {/* Column headers */}
                                    <div className="flex text-[9px] font-black uppercase tracking-widest text-gray-600 bg-[#1c2028] border-b border-white/5 px-0 py-1.5">
                                        <span className="w-10 text-right pr-2 border-r border-white/5">Old</span>
                                        <span className="w-10 text-right pr-2 border-r border-white/5">New</span>
                                        <span className="w-5 text-center">±</span>
                                        <span className="pl-2">Content</span>
                                    </div>
                                    <div className="p-0">
                                        <UnifiedDiffBlock diff={activeDiff} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-3">
                                <FileText className="w-10 h-10 opacity-20" />
                                <p className="text-sm">Select a file to preview changes</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/[0.07] bg-[#161b22] flex items-center justify-between gap-3 shrink-0">
                    <p className="text-xs text-gray-600">
                        {Object.values(applyStatus).filter(s => s === 'applied').length} / {diffs.length} applied
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            Close
                        </button>
                        {onApply && !allApplied && (
                            <button
                                onClick={handleApplyAll}
                                disabled={applyAllRunning}
                                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-[0_8px_20px_-5px_rgba(59,130,246,0.5)] hover:shadow-[0_8px_25px_-5px_rgba(59,130,246,0.7)] active:scale-95 disabled:opacity-60"
                            >
                                {applyAllRunning
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying All…</>
                                    : <><CheckCheck className="w-3.5 h-3.5" /> Apply All</>}
                            </button>
                        )}
                        {allApplied && onApply && (
                            <span className="flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest text-green-400">
                                <CheckCheck className="w-3.5 h-3.5" /> All Applied
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
