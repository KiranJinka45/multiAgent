"use client";

import { useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { realtimeManager } from './realtime-manager';

export interface RealtimeSyncOptions {
    channelName: string;
    table: string;
    filter?: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    onUpdate: (payload: any) => void;
    onError?: (status: string) => void;
}

export function useRealtimeSync({
    channelName,
    table,
    filter,
    event = '*',
    onUpdate,
    onError
}: RealtimeSyncOptions) {
    const channelRef = useRef<any>(null);
    const callbackRef = useRef(onUpdate);

    // Keep callback fresh without re-triggering effect
    useEffect(() => {
        callbackRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        if (!channelName) return;

        console.log(`[RealtimeSync] Subscribing to ${channelName} on ${table}`);
        const channel = realtimeManager.getChannel(channelName);
        channelRef.current = channel;

        channel.on(
            'postgres_changes',
            { event, schema: 'public', table, filter },
            (payload) => callbackRef.current(payload)
        );

        realtimeManager.subscribe(channelName, (status) => {
            if (status === 'CHANNEL_ERROR' && onError) {
                onError(status);
            }
        });

        return () => {
            console.log(`[RealtimeSync] Unsubscribing from ${channelName}`);
            realtimeManager.safeUnsubscribe(channelName);
            channelRef.current = null;
        };
    }, [channelName, table, filter, event, onError]);

    return channelRef.current;
}
