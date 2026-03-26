'use client';

import { useEffect, useRef } from 'react';
import Editor, { OnChange, OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { Sparkles, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface CodeEditorProps {
  content: string;
  onChange: (value: string | undefined) => void;
  fileName: string;
  projectId: string;
}

interface MonacoModel {
  getValue: () => string;
  getOffsetAt: (position: any) => number;
}

export default function CodeEditor({ content, onChange, fileName, projectId }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const [isAiOverlayOpen, setIsAiOverlayOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Initialize Yjs for collaboration
    const doc = new Y.Doc();
    docRef.current = doc;
    
    // Connect to websocket provider with standardized room naming
    const roomName = `project:${projectId}:file:${fileName}`;
    const provider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_YJS_URL || 'ws://localhost:3011', 
      roomName, 
      doc
    );
    providerRef.current = provider;

    const type = doc.getText('monaco');
    
    // Bind Yjs text type to Monaco editor
    new MonacoBinding(type, editor.getModel()!, new Set([editor]), provider.awareness);

    // Register AI Inline Completions (Ghost Text)
    monaco.languages.registerInlineCompletionsProvider('typescript', {
      provideInlineCompletions: async (model: any, position: any) => {
        const m = model as MonacoModel;
        const code = m.getValue();
        const prefix = code.slice(0, m.getOffsetAt(position));

        try {
          const res = await fetch('/api/ai/inline', {
            method: 'POST',
            body: JSON.stringify({ prefix, projectId, fileName }),
          });

          const { suggestion } = await res.json();

          if (!suggestion) return { items: [] };

          return {
            items: [
              {
                insertText: suggestion,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              },
            ],
          };
        } catch (err) {
          console.error('[AI-Inline] Error:', err);
          return { items: [] };
        }
      },
    });

    console.log(`[CodeEditor] Yjs connected for ${fileName} in project ${projectId}`);
  };

  const handleEditorChange: OnChange = (value) => {
    onChange(value);
  };

  const getSimplifiedLanguage = (ext: string) => {
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      default:
        return 'typescript';
    }
  };

  const extension = fileName.split('.').pop() || '';

  // Cleanup on unmount or file change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsAiOverlayOpen(true);
      }
      if (e.key === 'Escape') {
        setIsAiOverlayOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
      }
      if (docRef.current) {
        docRef.current.destroy();
      }
    };
  }, [fileName]);

  const handleAiEdit = async () => {
    if (!aiPrompt.trim()) return;
    setIsApplying(true);
    const toastId = toast.loading("AI is thinking...");

    try {
      const res = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          projectId,
          fileName,
          content: editorRef.current?.getValue() || ''
        }),
      });

      const { success, newContent, error } = await res.json();

      if (success && newContent) {
        editorRef.current?.setValue(newContent);
        toast.success("AI refactor applied!", { id: toastId });
        setIsAiOverlayOpen(false);
        setAiPrompt('');
      } else {
        toast.error(`Refactor failed: ${error}`, { id: toastId });
      }
    } catch (err) {
      console.error('[AI-Edit] Error:', err);
      toast.error("Deep AI refactor failed", { id: toastId });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#1e1e1e] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={getSimplifiedLanguage(extension)}
          value={content}
          theme="vs-dark"
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 20 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: 'all',
          }}
        />
      </div>

      {isAiOverlayOpen && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] z-[100] animate-in fade-in zoom-in duration-200">
          <div className="bg-[#252526] border border-primary/30 rounded-lg shadow-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-primary font-semibold">
              <div className="flex items-center gap-2">
                <Sparkles size={14} />
                <span>AI REFACTOR (CTRL+K)</span>
              </div>
              <button onClick={() => setIsAiOverlayOpen(false)} className="hover:text-white">
                <X size={14} />
              </button>
            </div>
            
            <div className="relative">
              <input
                autoFocus
                type="text"
                placeholder="How should I modify this code?"
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAiEdit();
                }}
              />
              {isApplying && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-neutral-500">
              <span>Press Enter to apply, Esc to cancel</span>
              <div className="flex gap-2">
                <span className="px-1.5 py-0.5 bg-white/5 rounded">Refactor</span>
                <span className="px-1.5 py-0.5 bg-white/5 rounded">Fix</span>
                <span className="px-1.5 py-0.5 bg-white/5 rounded">Optimize</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
