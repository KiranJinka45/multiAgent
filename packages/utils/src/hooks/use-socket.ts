"use client";

import { useEffect, useState, useRef } from 'react';
import { BuildUpdate } from '@packages/contracts';
import { socketManager } from '../client/socketManager';

export interface UseSocketOptions {
    projectId: string;
    onUpdate?: (update: BuildUpdate) => void;
    serverUrl?: string;
}

export function useSocket({ projectId, onUpdate, serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3010' }: UseSocketOptions) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<BuildUpdate | null>(null);

    // Use a ref for the callback so changing it doesn't trigger the effect
    const onUpdateRef = useRef(onUpdate);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        let isMounted = true;

        // 1. Connect or retrieve singleton socket
        const initializeSocket = async () => {
            const socket = await socketManager.connect({ serverUrl });

            if (isMounted) {
                // Determine current connection state
                setIsConnected(!!socket && socket.connected);

                if (socket && socket.connected) {
                    socketManager.emit('join-project', projectId);
                }
            }
        };

        initializeSocket();

        // 2. Listen to connection state changes
        const unmountConnectionListener = socketManager.addConnectionListener((connected) => {
            if (isMounted) {
                setIsConnected(connected);
                if (connected) {
                    // Re-join room on reconnect
                    socketManager.emit('join-project', projectId);
                }
            }
        });

        // 3. Listen to build updates
        const unmountUpdateListener = socketManager.addUpdateListener('build-update', (data: BuildUpdate) => {
            if (isMounted) {
                setLastUpdate(data);
                if (onUpdateRef.current) onUpdateRef.current(data);
            }
        });

        return () => {
            isMounted = false;
            // Unsubscribe listeners but DO NOT disconnect the singleton socket
            unmountConnectionListener();
            unmountUpdateListener();
        };
    }, [projectId, serverUrl]);

    return {
        isConnected,
        lastUpdate,
        // Optional manual reconnect trigger if desired
        reconnect: () => socketManager.connect({ serverUrl })
    };
}
