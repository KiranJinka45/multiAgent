import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { projectService } from './project-service';

interface ChannelContainer {
    channel: RealtimeChannel;
    refCount: number;
    subscribePromise: Promise<any> | null;
    retryCount: number;
    retryTimeout: ReturnType<typeof setTimeout> | null;
    isSubscribed: boolean;
}

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 2000; // 2s, 4s, 8s, 16s, 32s

class RealtimeManager {
    private static instance: RealtimeManager;
    private containers: Map<string, ChannelContainer> = new Map();
    private supabase: any = null;

    private getSupabase() {
        if (!this.supabase) {
            this.supabase = projectService.getSupabase();
        }
        return this.supabase;
    }

    static getInstance(): RealtimeManager {
        if (!this.instance) {
            this.instance = new RealtimeManager();
        }
        return this.instance;
    }

    getChannel(name: string): RealtimeChannel {
        let container = this.containers.get(name);

        if (!container) {
            const channel = this.getSupabase().channel(name);
            container = {
                channel,
                refCount: 0,
                subscribePromise: null,
                retryCount: 0,
                retryTimeout: null,
                isSubscribed: false
            };
            this.containers.set(name, container);
        }

        container.refCount++;
        return container.channel;
    }

    subscribe(name: string, onStatus?: (status: string) => void) {
        const container = this.containers.get(name);
        if (!container || container.isSubscribed) return;

        // Mark as subscribed immediately to prevent double-subscribe from StrictMode
        container.isSubscribed = true;

        const attemptSubscribe = () => {
            // If the channel is already in a joining or joined state, don't re-subscribe
            // This prevents "WebSocket is closed before the connection is established" errors
            if (container.channel.state === 'joining' || container.channel.state === 'joined') {
                return;
            }

            container.subscribePromise = new Promise((resolve) => {
                container.channel.subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        container.retryCount = 0;
                        if (onStatus) onStatus(status);
                        resolve(status);
                    } else if (status === 'CHANNEL_ERROR') {
                        // Retry with exponential backoff instead of immediately failing
                        if (container.retryCount < MAX_RETRIES && container.refCount > 0) {
                            const delay = BASE_RETRY_DELAY * Math.pow(2, container.retryCount);
                            container.retryCount++;
                            console.debug(`[RealtimeManager] Channel "${name}" error. Retry ${container.retryCount}/${MAX_RETRIES} in ${delay}ms`);

                            // Remove the failed channel and recreate
                            container.retryTimeout = setTimeout(() => {
                                if (container.refCount <= 0) return; // Component unmounted

                                try {
                                    this.supabase.removeChannel(container.channel);
                                } catch (e) { /* ignore cleanup errors */ }

                                // Create a fresh channel with the same name
                                const newChannel = this.getSupabase().channel(name);
                                container.channel = newChannel;
                                container.subscribePromise = null;
                                container.isSubscribed = false;

                                // Re-apply any postgres_changes listeners
                                // Note: callers must re-attach .on() listeners when channel is recreated
                                // For now, just attempt subscribe again
                                container.isSubscribed = true;
                                attemptSubscribe();
                            }, delay);
                        } else {
                            // Only notify caller after all retries exhausted
                            console.warn(`[RealtimeManager] Channel "${name}" failed after ${MAX_RETRIES} retries.`);
                            if (onStatus) onStatus(status);
                            resolve(status);
                        }
                    } else if (status === 'TIMED_OUT') {
                        console.debug(`[RealtimeManager] Channel "${name}" timed out. Will retry...`);
                        if (container.retryCount < MAX_RETRIES) {
                            container.retryCount++;
                            container.subscribePromise = null;
                            container.isSubscribed = false;
                            setTimeout(() => {
                                if (container.refCount > 0) {
                                    container.isSubscribed = true;
                                    attemptSubscribe();
                                }
                            }, BASE_RETRY_DELAY);
                        }
                    } else {
                        // CLOSED or other status
                        if (onStatus) onStatus(status);
                        resolve(status);
                    }
                });
            });
        };

        attemptSubscribe();
    }

    safeUnsubscribe(name: string) {
        const container = this.containers.get(name);
        if (!container) return;

        container.refCount--;

        if (container.refCount <= 0) {
            // Clear any pending retries
            if (container.retryTimeout) {
                clearTimeout(container.retryTimeout);
                container.retryTimeout = null;
            }

            const channel = container.channel;
            if (channel.state === 'joining') {
                container.subscribePromise?.then(() => {
                    if (container.refCount <= 0) {
                        try { this.supabase.removeChannel(channel); } catch (e) { /* ignore */ }
                        this.containers.delete(name);
                    }
                });
            } else {
                try { this.supabase.removeChannel(channel); } catch (e) { /* ignore */ }
                this.containers.delete(name);
            }
        }
    }
}

export const realtimeManager = RealtimeManager.getInstance();
