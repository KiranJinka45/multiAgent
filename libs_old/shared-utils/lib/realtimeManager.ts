import { getSupabaseClient } from './supabaseClient';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Define strict types for bindings, matching what Supabase server expects
export interface PostgresBinding {
    event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    schema: string;
    table: string;
    filter?: string;
}

type PayloadCallback = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

class RealtimeManager {
    private static instance: RealtimeManager;

    // Track channels physically open to Supabase
    private channels: Map<string, {
        channel: RealtimeChannel;
        refCount: number;
        status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | 'CONNECTING';
        teardownTimer?: NodeJS.Timeout;
        // multiplexing maps: bindingHash -> array of callbacks waiting for this event
        callbacks: Map<string, Set<PayloadCallback>>;
    }> = new Map();

    private constructor() { }

    public static getInstance() {
        if (!RealtimeManager.instance) {
            RealtimeManager.instance = new RealtimeManager();
        }
        return RealtimeManager.instance;
    }

    // Hash the exact bindings to verify uniqueness and equality
    private hashBinding(b: PostgresBinding): string {
        return `${b.event}:${b.schema}:${b.table}:${b.filter || 'none'}`;
    }

    public subscribe(
        baseChannelName: string,
        binding: PostgresBinding,
        callback: PayloadCallback
    ): () => void {
        const supabase = getSupabaseClient();

        // 1. Runtime validation
        if (!binding.schema || !binding.table || !binding.event) {
            throw new Error(`[RealtimeManager] Invalid binding submitted for ${baseChannelName}. Schema, table, and event are required.`);
        }

        const bHash = this.hashBinding(binding);

        // 2. We suffix the channel name with the binding hash to guarantee isolation.
        // If two components want DIFFERENT bindings, they safely get DIFFERENT channels.
        // If they want the SAME bindings, they get multiplexed efficiently into ONE channel.
        const channelName = `${baseChannelName}_${bHash.replace(/[:]/g, '_').replace(/=/g, '_')}`;

        let channelRecord = this.channels.get(channelName);

        if (!channelRecord) {
            console.log(`[RealtimeManager] Creating new isolated channel: ${channelName}`);
            const newChannel = supabase.channel(channelName);

            channelRecord = {
                channel: newChannel,
                refCount: 0,
                status: 'CONNECTING',
                callbacks: new Map()
            };

            this.channels.set(channelName, channelRecord);

            // Execute `.on(...)` exactly ONCE against the Supabase server.
            newChannel.on('postgres_changes', binding, (payload) => {
                // Fan out to all React components registered to this specific binding hash
                const listeners = channelRecord?.callbacks.get(bHash);
                if (listeners) {
                    listeners.forEach(cb => cb(payload));
                }
            }).subscribe(async (status, err) => {
                const record = this.channels.get(channelName);
                if (record) record.status = status;

                if (status === 'SUBSCRIBED') {
                    console.log(`[RealtimeManager] ${channelName} connected successfully.`);
                    // Reset backoff on success (could be tracked per channel)
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`[RealtimeManager] ${channelName} connection error. Status: ${status}`, err);
                    
                    // Trigger exponential backoff retry for this channel if it's a critical error
                    // Supabase handles some retries internally, but if it fails repeatedly,
                    // we should ensure it doesn't block the build event loop.
                    if (record && record.refCount > 0) {
                        const backoffMs = Math.min(1000 * Math.pow(2, 3), 10000); // Max 10s wait
                        console.log(`[RealtimeManager] Retrying ${channelName} in ${backoffMs}ms...`);
                        setTimeout(() => {
                            if (this.channels.has(channelName)) {
                                record.channel.subscribe();
                            }
                        }, backoffMs);
                    }
                } else if (status === 'CLOSED') {
                    console.log(`[RealtimeManager] ${channelName} connection closed.`);
                }
            });
        } else {
            console.log(`[RealtimeManager] Reusing multiplexed channel: ${channelName}`);
            if (channelRecord.teardownTimer) {
                console.log(`[RealtimeManager] Cancelling teardown for ${channelName} due to quick StrictMode remount`);
                clearTimeout(channelRecord.teardownTimer);
                channelRecord.teardownTimer = undefined;
            }
        }

        // 3. Register callback locally
        if (!channelRecord.callbacks.has(bHash)) {
            channelRecord.callbacks.set(bHash, new Set());
        }
        channelRecord.callbacks.get(bHash)!.add(callback);
        channelRecord.refCount++;

        console.log(`[RealtimeManager] ${channelName} subscribers: ${channelRecord.refCount}`);

        // 4. Teardown logic
        return () => {
            const record = this.channels.get(channelName);
            if (record) {
                // remove the callback from multiplexer
                const listeners = record.callbacks.get(bHash);
                if (listeners) {
                    listeners.delete(callback);
                }

                record.refCount--;
                console.log(`[RealtimeManager] ${channelName} remaining subscribers: ${record.refCount}`);

                if (record.refCount <= 0) {
                    console.log(`[RealtimeManager] Scheduling teardown for ${channelName} in 5000ms`);
                    record.teardownTimer = setTimeout(() => {
                        const lateRecord = this.channels.get(channelName);
                        if (lateRecord && lateRecord.refCount <= 0) {
                            console.log(`[RealtimeManager] Removing channel fully: ${channelName}`);
                            supabase.removeChannel(lateRecord.channel);
                            this.channels.delete(channelName);
                        }
                    }, 1500);
                }
            }
        };
    }
}

export const realtimeManager = RealtimeManager.getInstance();
