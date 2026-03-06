"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { BuildUpdate } from '@/types/build';

export interface UseSocketOptions {
    projectId: string;
    onUpdate?: (update: BuildUpdate) => void;
    serverUrl?: string;
}

export function useSocket({ projectId, onUpdate, serverUrl = 'http://localhost:3005' }: UseSocketOptions) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<BuildUpdate | null>(null);

    const connect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        console.log(`[Socket.IO] Connecting to ${serverUrl} for project ${projectId}`);
        const socket = io(serverUrl, {
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket.IO] Connected to server');
            setIsConnected(true);
            socket.emit('join-project', projectId);
        });

        socket.on('disconnect', () => {
            console.log('[Socket.IO] Disconnected');
            setIsConnected(false);
        });

        socket.on('build-update', (data: BuildUpdate) => {
            setLastUpdate(data);
            if (onUpdate) onUpdate(data);
        });

        socket.on('connect_error', (error) => {
            console.warn('[Socket.IO] Connection error:', error);
        });

        return socket;
    }, [projectId, serverUrl, onUpdate]);

    useEffect(() => {
        const socket = connect();

        return () => {
            console.log('[Socket.IO] Component unmounting, disconnecting...');
            socket.disconnect();
        };
    }, [connect]);

    return {
        isConnected,
        lastUpdate,
        socket: socketRef.current,
        reconnect: connect
    };
}
