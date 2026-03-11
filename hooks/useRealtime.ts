"use client";

import { useEffect, useRef } from 'react';
import { realtimeManager, type PostgresBinding } from '@/lib/realtimeManager';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useRealtime(
    channelName: string, 
    binding: PostgresBinding, 
    setupCallback: (payload: RealtimePostgresChangesPayload<any>) => void
) {
    const isSubscribedRef = useRef(false);

    useEffect(() => {
        // Prevent React StrictMode double invocations
        if (isSubscribedRef.current) return;
        isSubscribedRef.current = true;

        const unsubscribe = realtimeManager.subscribe(channelName, binding, setupCallback);

        return () => {
            isSubscribedRef.current = false;
            unsubscribe();
        };
        // We INTENTIONALLY don't put setupCallback in the dependency block. 
        // This hook is designed to fire exactly ONCE per component mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelName]);
}
