"use client";

import { useEffect, useRef } from 'react';
import { realtimeManager, PostgresBinding } from '../client/realtimeManager';
import type { RealtimePostgresChangesPayload } from '@packages/supabase';

/**
 * A safe React hook for Supabase Realtime Postgres Changes.
 * 
 * Prevents "mismatch between client and server bindings" errors
 * by guaranteeing that structural bindings are submitted natively 
 * to the robust `RealtimeManager` multiplexer exactly once per StrictMode mount.
 * 
 * @param channelName Base name for this channel logical context
 * @param binding The strict Postgres changes matching object
 * @param callback The function to execute when payloads multiplex to this component
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>(
    baseChannelName: string,
    binding: PostgresBinding,
    callback: (payload: RealtimePostgresChangesPayload<T>) => void
) {
    const isSubscribedRef = useRef(false);

    // Provide a stable callback string comparison via dependency array
    const bindingHash = `${binding.event}:${binding.schema}:${binding.table}:${binding.filter || 'none'}`;

    useEffect(() => {
        if (isSubscribedRef.current) return;
        isSubscribedRef.current = true;

        const unsubscribe = realtimeManager.subscribe(
            baseChannelName,
            binding,
            (payload) => callback(payload as RealtimePostgresChangesPayload<T>)
        );

        return () => {
            isSubscribedRef.current = false;
            unsubscribe();
        };

        // We explicitly ignore the `callback` function passing here because the registry 
        // controls local callback sets directly and recreating connections per function inline is dangerous.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseChannelName, bindingHash]);
}
