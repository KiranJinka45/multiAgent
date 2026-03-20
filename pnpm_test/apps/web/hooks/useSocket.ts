'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useProjectStore, BuildStepId } from '@/store/useProjectStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:4000';

export function useSocket(buildId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const { setStatus, setPreviewUrl, addLog, addActivity } = useProjectStore();

  useEffect(() => {
    if (!buildId) return;

    // Connect to gateway
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to mission cluster');
      socket.emit('subscribe', buildId);
    });

    // Listen for status updates (progress events)
    socket.on('progress', (event: Record<string, unknown>) => {
      if (typeof event.status === 'string') setStatus(event.status as BuildStepId);
      if (typeof event.message === 'string') addLog(event.message);
    });

    // Listen for final completion (complete event)
    socket.on('complete', (event: Record<string, unknown>) => {
      setStatus('complete');
      const metadata = event.metadata as Record<string, unknown> | undefined;
      if (typeof metadata?.previewUrl === 'string') {
        setPreviewUrl(metadata.previewUrl);
      }
      if (typeof event.message === 'string') addLog(event.message);
    });

    // Listen for agent thoughts (thought event)
    socket.on('thought', (event: Record<string, unknown>) => {
      const metadata = event.metadata as Record<string, unknown> | undefined;
      if (typeof event.message === 'string') {
        addLog(`${metadata?.agent || 'Agent'}: ${event.message}`);
      }
    });

    // Listen for agent activity (agent event)
    socket.on('agent', (event: Record<string, unknown>) => {
      addActivity(event);
    });

    // Listen for errors
    socket.on('error', (event: Record<string, unknown>) => {
      setStatus('error');
      if (typeof event.message === 'string') addLog(`ERROR: ${event.message}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [buildId, setStatus, setPreviewUrl, addLog, addActivity]);

  return socketRef.current;
}
