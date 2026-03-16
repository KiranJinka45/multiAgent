import { useState, memo } from 'react';
import dynamic from 'next/dynamic';
import { Check, Copy } from 'lucide-react';

const SyntaxHighlighter = dynamic(
    () => import('react-syntax-highlighter').then(mod => mod.Prism),
    { ssr: false, loading: () => <pre className="p-6 text-sm font-mono text-neutral-400">Loading editor...</pre> }
);
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
    language: string;
    value: string;
    isStreaming?: boolean;
}

function CodeBlockComponent({ language, value, isStreaming }: CodeBlockProps) {
    // ... existing content (lines 15-72)
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async () => {
        if (!value) return;
        await navigator.clipboard.writeText(value);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="relative w-full rounded-lg overflow-hidden my-4 border border-white/10 bg-[#1e1e1e]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
                <span className="text-xs font-medium text-neutral-400 lowercase">{language || 'text'} {isStreaming && <span className="ml-2 animate-pulse text-primary">• generating</span>}</span>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                >
                    {isCopied ? (
                        <>
                            <Check size={14} className="text-green-500" />
                            <span>Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy size={14} />
                            <span>Copy code</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code */}
            <div className="custom-scrollbar overflow-x-auto">
                {isStreaming ? (
                    <pre className="p-6 text-sm font-mono leading-relaxed text-neutral-300 bg-transparent whitespace-pre">
                        <code>{value}</code>
                        <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/80 animate-pulse align-middle" />
                    </pre>
                ) : (
                    <SyntaxHighlighter
                        language={language || 'text'}
                        style={atomDark}
                        customStyle={{
                            margin: 0,
                            padding: '1.5rem',
                            background: 'transparent',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                        }}
                        wrapLines={true}
                        showLineNumbers={false}
                        PreTag="div"
                    >
                        {value}
                    </SyntaxHighlighter>
                )}
            </div>
        </div>
    );
}

export default memo(CodeBlockComponent);
