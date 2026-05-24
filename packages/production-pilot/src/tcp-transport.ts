import * as net from 'node:net';
import * as tls from 'node:tls';
import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import type { ReplicationTransport, ReplicationMessage } from './replicated-wal.js';
import { ConnectionSupervisor } from './cluster-governance.js';
import { propagation, context } from '@opentelemetry/api';

export interface TlsConfig {
    cert: string;
    key: string;
    ca?: string;
    rejectUnauthorized?: boolean;
    requestCert?: boolean;
}

export interface TcpPeerConfig {
    nodeId: string;
    host: string;
    port: number;
}

interface PendingRequest {
    resolve: (val: any) => void;
    reject: (err: any) => void;
    timeout: NodeJS.Timeout;
}

export class TcpReplicationTransport implements ReplicationTransport {
    private localNodeId: string;
    private port: number;
    private server: net.Server | tls.Server;
    private peers = new Map<string, TcpPeerConfig>();
    private activeSockets = new Map<string, net.Socket | tls.TLSSocket>();
    private incomingSockets = new Set<net.Socket | tls.TLSSocket>();
    private supervisor = new ConnectionSupervisor();
    
    private handler: ((msg: ReplicationMessage) => Promise<ReplicationMessage>) | null = null;
    
    // Correlate message responses
    private pendingRequests = new Map<string, PendingRequest>();

    constructor(localNodeId: string, port: number, private tlsConfig?: TlsConfig) {
        this.localNodeId = localNodeId;
        this.port = port;
        
        if (this.tlsConfig) {
            this.server = tls.createServer({
                key: this.tlsConfig.key,
                cert: this.tlsConfig.cert,
                ca: this.tlsConfig.ca,
                requestCert: this.tlsConfig.requestCert ?? true,
                rejectUnauthorized: this.tlsConfig.rejectUnauthorized ?? true
            }, this.handleIncomingConnection.bind(this));
        } else {
            this.server = net.createServer(this.handleIncomingConnection.bind(this));
        }
        
        this.server.on('connection', (socket: any) => {
            this.incomingSockets.add(socket);
            socket.on('close', () => {
                this.incomingSockets.delete(socket);
            });
        });

        this.server.on('error', (err) => {
            console.error(`[TCP Transport ${this.localNodeId}] Server error: ${err.message}`);
        });
    }

    public updateTlsCredentials(cert: string, key: string, ca?: string): void {
        if (!this.tlsConfig) {
            this.tlsConfig = { cert, key, ca };
        } else {
            this.tlsConfig.cert = cert;
            this.tlsConfig.key = key;
            this.tlsConfig.ca = ca;
        }

        if (this.server && 'setSecureContext' in this.server) {
            (this.server as any).setSecureContext({ cert, key, ca });
        }
    }

    public addPeer(nodeId: string, host: string, port: number) {
        this.peers.set(nodeId, { nodeId, host, port });
    }

    public getPeerConfig(nodeId: string): TcpPeerConfig | undefined {
        return this.peers.get(nodeId);
    }


    public registerNode(nodeId: string, handler: (msg: ReplicationMessage) => Promise<ReplicationMessage>): void {
        if (nodeId === this.localNodeId) {
            this.handler = handler;
        } else {
            // Note: ReplicatedWalCoordinator and FollowerSyncAgent expect to register themselves locally
            // In a distributed setup, they only register their own local nodeId.
        }
    }

    public async start(): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(this.port, '127.0.0.1', () => {
                console.log(`[TCP Transport ${this.localNodeId}] Listening on port ${this.port}`);
                resolve();
            });
        });
    }

    public async stop(): Promise<void> {
        return new Promise((resolve) => {
            for (const socket of this.activeSockets.values()) {
                socket.destroy();
            }
            this.activeSockets.clear();
            
            for (const socket of this.incomingSockets.values()) {
                socket.destroy();
            }
            this.incomingSockets.clear();
            
            for (const req of this.pendingRequests.values()) {
                clearTimeout(req.timeout);
                req.reject(new Error('Transport stopped'));
            }
            this.pendingRequests.clear();

            this.server.close(() => resolve());
        });
    }

    private handleIncomingConnection(socket: net.Socket) {
        socket.setKeepAlive(true, 1000);
        let buffer = '';
        socket.setEncoding('utf8');
        
        socket.on('data', async (data) => {
            buffer += data;
            
            const parts = buffer.split('\n');
            buffer = parts.pop() || ''; // keep the incomplete part

            for (const part of parts) {
                if (!part.trim()) continue;
                if (!part.trim().startsWith('{')) continue; // Ignore HTTP probes or garbage
                try {
                    const parsed = JSON.parse(part);
                    this.processMessage(socket, parsed).catch((err) => {
                        console.error(`[TCP Transport ${this.localNodeId}] Error processing message: ${err.message}`);
                    });
                } catch (err) {
                    // Silent ignore of framing garbage
                }
            }
        });

        socket.on('error', (err) => {
            // Ignore normal connection resets from peers
        });
    }

    private async processMessage(socket: net.Socket, msgWrap: any) {
        if (msgWrap.isResponse) {
            // It's a response to one of our requests
            const req = this.pendingRequests.get(msgWrap.msgId);
            if (req) {
                clearTimeout(req.timeout);
                this.pendingRequests.delete(msgWrap.msgId);
                req.resolve(msgWrap.payload);
            }
            return;
        }

        // It's an incoming request
        if (this.handler) {
            try {
                const traceContext = msgWrap.payload?.traceContext || {};
                const parentCtx = propagation.extract(context.active(), traceContext);

                const responseMsg = await context.with(parentCtx, () => this.handler!(msgWrap.payload));
                const responseWrap = {
                    isResponse: true,
                    msgId: msgWrap.msgId,
                    payload: responseMsg
                };
                this.writeToSocket(socket, JSON.stringify(responseWrap) + '\n');
            } catch (err: any) {
                // Send back an error or just timeout? For replication, returning the error is fine or timeout.
                // We'll let it timeout for simplicity if the handler fails catastrophically.
            }
        }
    }

    private async getPeerSocket(targetNodeId: string): Promise<net.Socket | tls.TLSSocket> {
        let socket = this.activeSockets.get(targetNodeId);
        if (socket && !socket.destroyed) {
            return socket;
        }

        const peer = this.peers.get(targetNodeId);
        if (!peer) {
            throw new Error(`[TCP Transport ${this.localNodeId}] Unknown peer: ${targetNodeId}`);
        }

        if (this.tlsConfig) {
            return new Promise<tls.TLSSocket>((resolve, reject) => {
                const connTimeout = setTimeout(() => {
                    this.activeSockets.delete(targetNodeId);
                    reject(new Error(`Connection timeout connecting to ${targetNodeId}`));
                }, 1000); // Bounded connection timeout

                const tlsSocket = tls.connect({
                    host: peer.host,
                    port: peer.port,
                    key: this.tlsConfig!.key,
                    cert: this.tlsConfig!.cert,
                    ca: this.tlsConfig!.ca,
                    rejectUnauthorized: this.tlsConfig!.rejectUnauthorized ?? true,
                    checkServerIdentity: (hostname, cert) => {
                        const cn = cert.subject?.CN;
                        if (!cn) {
                            return new Error('Certificate has no CN');
                        }
                        if (cn !== targetNodeId && !cn.startsWith(targetNodeId)) {
                            return new Error(`Certificate CN (${cn}) does not match target node ID (${targetNodeId})`);
                        }
                        return undefined;
                    }
                }, () => {
                    clearTimeout(connTimeout);
                    this.activeSockets.set(targetNodeId, tlsSocket);
                    this.supervisor.resetBackoff(targetNodeId);
                    
                    // Set up incoming responses for this outgoing connection
                    this.handleIncomingConnection(tlsSocket);
                    resolve(tlsSocket);
                });

                tlsSocket.setKeepAlive(true, 1000);

                tlsSocket.on('error', (err) => {
                    clearTimeout(connTimeout);
                    this.activeSockets.delete(targetNodeId);
                    reject(err);
                });

                tlsSocket.on('close', () => {
                    this.activeSockets.delete(targetNodeId);
                });
            });
        }

        socket = new net.Socket();
        socket.setKeepAlive(true, 1000);
        
        return new Promise<net.Socket>((resolve, reject) => {
            const connTimeout = setTimeout(() => {
                socket!.destroy();
                this.activeSockets.delete(targetNodeId);
                reject(new Error(`Connection timeout connecting to ${targetNodeId}`));
            }, 1000); // Bounded connection timeout

            socket!.connect(peer.port, peer.host, () => {
                clearTimeout(connTimeout);
                this.activeSockets.set(targetNodeId, socket!);
                this.supervisor.resetBackoff(targetNodeId);
                
                // Set up incoming responses for this outgoing connection
                this.handleIncomingConnection(socket!);
                resolve(socket!);
            });

            socket!.on('error', (err) => {
                clearTimeout(connTimeout);
                this.activeSockets.delete(targetNodeId);
                reject(err);
            });
            
            socket!.on('close', () => {
                this.activeSockets.delete(targetNodeId);
            });
        });
    }

    private writeToSocket(socket: net.Socket, data: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (socket.destroyed) return reject(new Error('Socket destroyed'));
            socket.write(data, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public async send(targetNodeId: string, msg: ReplicationMessage, retries = 3): Promise<ReplicationMessage> {
        const msgId = crypto.randomUUID();
        const requestWrap = {
            isResponse: false,
            msgId,
            payload: msg
        };
        const payloadStr = JSON.stringify(requestWrap) + '\n';

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const socket = await this.getPeerSocket(targetNodeId);
                
                return await new Promise<ReplicationMessage>(async (resolve, reject) => {
                    const timeout = setTimeout(() => {
                        this.pendingRequests.delete(msgId);
                        reject(new Error(`Timeout waiting for response from ${targetNodeId}`));
                    }, 1500); // Message response deadline

                    this.pendingRequests.set(msgId, { resolve, reject, timeout });

                    try {
                        await this.writeToSocket(socket, payloadStr);
                    } catch (err) {
                        clearTimeout(timeout);
                        this.pendingRequests.delete(msgId);
                        reject(err);
                    }
                });

            } catch (err: any) {
                // If it's a connection error or timeout, retry
                if (attempt === retries) {
                    throw new Error(`[TCP Transport ${this.localNodeId}] Failed to send to ${targetNodeId} after ${retries} attempts: ${err.message}`);
                }
                // Exponential backoff via Supervisor
                const backoff = this.supervisor.getBackoff(targetNodeId);
                await new Promise(res => setTimeout(res, backoff));
            }
        }
        
        throw new Error('Unreachable');
    }
}
