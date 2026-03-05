"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

export interface StreamOptions<T> {
    url: string;
    onData: (data: T) => void;
    onError?: (error: any) => void;
    heartbeatTimeout?: number;
}

export function useStream<T>({ url, onData, onError, heartbeatTimeout = 15000 }: StreamOptions<T>) {
    const eventSourceRef = useRef<EventSource | null>(null);
    const lastMessageRef = useRef<number>(Date.now());
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        console.log(`[StreamClient] Connecting to ${url}`);
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
            console.log(`[StreamClient] Connected to ${url}`);
            setStatus('connected');
            lastMessageRef.current = Date.now();
        };

        es.onmessage = (event) => {
            try {
                lastMessageRef.current = Date.now();
                const data = JSON.parse(event.data);
                onData(data);
            } catch (err) {
                console.error('[StreamClient] Parse error:', err);
            }
        };

        es.onerror = (err) => {
            console.warn(`[StreamClient] Connection error on ${url}:`, err);
            setStatus('error');
            if (onError) onError(err);
        };
    }, [url, onData, onError]);

    useEffect(() => {
        connect();

        const heartbeatInterval = setInterval(() => {
            const timeSinceLastMessage = Date.now() - lastMessageRef.current;
            if (timeSinceLastMessage > heartbeatTimeout) {
                console.warn(`[StreamClient] Heartbeat stale (${timeSinceLastMessage}ms). Reconnecting...`);
                connect();
            }
        }, 5000);

        return () => {
            console.log(`[StreamClient] Closing stream to ${url}`);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            clearInterval(heartbeatInterval);
        };
    }, [connect, url, heartbeatTimeout]);

    return { status, reconnect: connect };
}
