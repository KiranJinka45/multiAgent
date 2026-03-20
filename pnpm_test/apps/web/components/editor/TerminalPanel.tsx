'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalPanelProps {
  projectId: string;
}

export default function TerminalPanel({ projectId }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // 1. Initialize Xterm.js
    const term = new Terminal({
      cursorBlinking: true,
      fontSize: 12,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#primary',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[32m[Terminal]\x1b[0m Connecting to container sandbox...');

    // 2. Connect to WebSocket Gateway
    const ws = new WebSocket(`ws://localhost:3011/terminal/${projectId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      term.writeln('\x1b[32m[Terminal]\x1b[0m Connected successfully.');
      term.write('\r\n$ ');
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      term.writeln('\r\n\x1b[31m[Terminal]\x1b[0m Connection closed.');
    };

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31m[Terminal]\x1b[0m WebSocket Error.');
    };

    // 3. Handle Input
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // 4. Handle Resize
    const resizeHandler = () => fitAddon.fit();
    window.addEventListener('resize', resizeHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      ws.close();
      term.dispose();
    };
  }, [projectId]);

  return (
    <div className="h-full w-full bg-[#1e1e1e] p-2 overflow-hidden border-t border-white/5 shadow-inner">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  );
}
