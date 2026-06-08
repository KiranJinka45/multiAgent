import * as http from 'http';
import { ConsensusEngine } from './consensus.js';
import type { PrepareMessage } from './consensus.js';

export class P2pServer {
    private server: http.Server | null = null;
    private localNodeId: string;

    constructor(nodeId: string) {
        this.localNodeId = nodeId;
    }

    start(port: number) {
        this.server = http.createServer((req, res) => {
            if (req.method === 'POST' && req.url === '/rpc/prepare') {
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', () => {
                    try {
                        const prepareMsg: PrepareMessage = JSON.parse(body);
                        const node = ConsensusEngine.getClusterNodes().get(this.localNodeId);
                        
                        if (node) {
                            const alreadyExists = node.preparePool.some(
                                p => p.nodeId === prepareMsg.nodeId && p.term === prepareMsg.term && p.merkleRoot === prepareMsg.merkleRoot
                            );
                            if (!alreadyExists) {
                                node.preparePool.push(prepareMsg);
                            }
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } catch (_e) {
                        res.writeHead(400);
                        res.end();
                    }
                });
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        this.server.listen(port, () => {
            console.log(`[P2P] Node ${this.localNodeId} listening on port ${port}`);
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
    }
}
