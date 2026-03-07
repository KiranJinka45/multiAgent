"use client";

import { useEffect, useRef } from 'react';
import { realtimeManager } from '@/lib/realtimeManager';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtime(channelName: string, setupCallback: (channel: RealtimeChannel) => void) {
    const isSubscribedRef = useRef(false);

    useEffect(() => {
        // Prevent React StrictMode double invocations
        if (isSubscribedRef.current) return;
        isSubscribedRef.current = true;

        const unsubscribe = realtimeManager.subscribe(channelName, setupCallback);

        return () => {
            isSubscribedRef.current = false;
            unsubscribe();
        };
        // We INTENTIONALLY don't put setupCallback in the dependency block. 
        // This hook is designed to fire exactly ONCE per component mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelName]);
}
