import io from 'socket.io-client';
import type * as SocketIOClient from 'socket.io-client';

export interface SocketManagerOptions {
    serverUrl?: string;
    path?: string;
}

class SocketManager {
    private static instance: SocketManager;
    private socket: SocketIOClient.Socket | null = null;
    private serverUrl: string = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3010') : 'http://localhost:3010';
    private isConnected: boolean = false;
    private isConnecting: boolean = false;
    private serverAvailable: boolean | null = null;
    private connectionAttempts: number = 0;
    private maxRetries: number = 5;
    private retryTimeout: NodeJS.Timeout | null = null;
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private listeners: Set<(connected: boolean) => void> = new Set();
    private updateListeners: Map<string, Set<(data: unknown) => void>> = new Map();

    private constructor() {
        // Private constructor for singleton
    }

    public static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    private notifyConnectionState() {
        this.listeners.forEach(listener => listener(this.isConnected));
    }

    public addConnectionListener(listener: (connected: boolean) => void) {
        this.listeners.add(listener);
        listener(this.isConnected); // Notify current state immediately
        return () => this.listeners.delete(listener);
    }

    public addUpdateListener(event: string, listener: (data: unknown) => void) {
        if (!this.updateListeners.has(event)) {
            this.updateListeners.set(event, new Set());
            if (this.socket) {
                this.socket.on(event, (data) => this.notifyUpdateListeners(event, data));
            }
        }
        this.updateListeners.get(event)!.add(listener);
        return () => {
            const listeners = this.updateListeners.get(event);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.updateListeners.delete(event);
                    if (this.socket) {
                        this.socket.off(event);
                    }
                }
            }
        };
    }

    private notifyUpdateListeners(event: string, data: unknown) {
        const listeners = this.updateListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => listener(data));
        }
    }

    private async checkServerHealth(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(`${this.serverUrl}/health`, {
                signal: controller.signal,
                method: 'GET'
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                return data.status === 'ok';
            }
            return false;
        } catch {
            return false;
        }
    }

    private connectionPromise: Promise<SocketIOClient.Socket | null> | null = null;

    public async connect(options?: SocketManagerOptions): Promise<SocketIOClient.Socket | null> {
        if (options?.serverUrl) {
            this.serverUrl = options.serverUrl;
        }

        if (this.socket && this.isConnected) {
            return this.socket;
        }

        if (this.connectionPromise) {
            console.log('[SocketManager] Reusing existing connection promise');
            return this.connectionPromise;
        }

        this.connectionPromise = (async () => {
            this.isConnecting = true;
            try {
                // 1. Check if server is reachable before initializing socket
                const isHealthy = await this.checkServerHealth();
                this.serverAvailable = isHealthy;

                if (!isHealthy) {
                    console.warn(`[SocketManager] Server at ${this.serverUrl} is unreachable.`);
                    this.scheduleRetry();
                    return null;
                }

                if (this.retryTimeout) {
                    clearTimeout(this.retryTimeout);
                    this.retryTimeout = null;
                }

                if (this.socket) {
                    this.socket.removeAllListeners();
                    this.socket.disconnect();
                }

                console.log(`[SocketManager] Initializing socket connection to ${this.serverUrl}`);
                this.socket = io(this.serverUrl, {
                    reconnection: false,
                    timeout: 5000,
                    transports: ['websocket', 'polling']
                });

                this.setupSocketListeners();
                return this.socket;
            } catch (error) {
                console.error('[SocketManager] Connection error:', error);
                this.scheduleRetry();
                return null;
            } finally {
                this.isConnecting = false;
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    private setupSocketListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('[SocketManager] Connected successfully');
            this.isConnected = true;
            this.isConnecting = false;
            this.connectionAttempts = 0;
            this.serverAvailable = true;
            this.notifyConnectionState();

            // Start health monitoring
            this.startHealthMonitoring();

            // Re-attach update listeners
            this.updateListeners.forEach((_, event) => {
                if (this.socket) {
                    this.socket.off(event); // clear any existing
                    this.socket.on(event, (data) => this.notifyUpdateListeners(event, data));
                }
            });
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`[SocketManager] Disconnected: ${reason}`);
            this.isConnected = false;
            this.notifyConnectionState();

            if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
                // Server went away or connection dropped. Schedule a health-check based retry.
                this.stopHealthMonitoring();
                this.scheduleRetry();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.warn(`[SocketManager] Connect error: ${error.message}`);
            this.isConnected = false;
            this.isConnecting = false;

            this.socket?.disconnect();
            this.scheduleRetry();
        });
    }

    private scheduleRetry() {
        if (this.connectionAttempts >= this.maxRetries) {
            console.error(`[SocketManager] Max auto-retries (${this.maxRetries}) reached. Giving up until manual reconnect.`);
            return;
        }

        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }

        this.connectionAttempts++;
        const backoffMs = Math.min(1000 * Math.pow(2, this.connectionAttempts), 10000); // Exponential backoff up to 10s

        console.log(`[SocketManager] Scheduling retry ${this.connectionAttempts}/${this.maxRetries} in ${backoffMs}ms`);

        this.retryTimeout = setTimeout(() => {
            this.isConnecting = false; // Reset flag to allow connect() to run
            this.connect();
        }, backoffMs);
    }

    private startHealthMonitoring() {
        this.stopHealthMonitoring();
        this.healthCheckInterval = setInterval(async () => {
            if (this.isConnected) {
                const isHealthy = await this.checkServerHealth();
                if (!isHealthy) {
                    console.warn('[SocketManager] Health check failed while connected. Forcing disconnect.');
                    this.socket?.disconnect(); // This will trigger 'disconnect' event and auto-reconnect logic
                }
            }
        }, 15000); // Check every 15s
    }

    private stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    public disconnect() {
        this.stopHealthMonitoring();
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }

        if (this.socket) {
            console.log('[SocketManager] Manually disconnecting');
            this.socket.disconnect();
            this.socket = null;
        }

        this.isConnected = false;
        this.isConnecting = false;
        this.connectionAttempts = 0;
        this.notifyConnectionState();
    }

    public emit(event: string, data: unknown) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
            return true;
        }
        return false;
    }

    public getSocket(): SocketIOClient.Socket | null {
        return this.socket;
    }
}

export const socketManager = SocketManager.getInstance();
