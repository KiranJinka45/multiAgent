"use client";

import { useEffect, useState } from 'react';
import { BuildUpdate } from '@shared-types/build';
import { socketManager } from '@/lib/socketManager';

export interface UseSocketOptions {
    projectId: string;
    onUpdate?: (update: BuildUpdate) => void;
    serverUrl?: string;
}

export function useSocket({ projectId, onUpdate, serverUrl = 'http://localhost:3005' }: UseSocketOptions) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<BuildUpdate | null>(null);

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
                if (onUpdate) onUpdate(data);
            }
        });

        return () => {
            isMounted = false;
            // Unsubscribe listeners but DO NOT disconnect the singleton socket
            unmountConnectionListener();
            unmountUpdateListener();
        };
    }, [projectId, serverUrl, onUpdate]);

    return {
        isConnected,
        lastUpdate,
        // Optional manual reconnect trigger if desired
        reconnect: () => socketManager.connect({ serverUrl })
    };
}
