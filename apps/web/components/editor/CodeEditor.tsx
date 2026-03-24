'use client';

import { useEffect, useRef } from 'react';
import Editor, { OnChange, OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

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
    return () => {
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
      }
      if (docRef.current) {
        docRef.current.destroy();
      }
    };
  }, [fileName]);

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
    </div>
  );
}
