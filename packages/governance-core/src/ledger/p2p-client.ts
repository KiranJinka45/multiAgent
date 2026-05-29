import type { PrepareMessage } from './consensus.js';
import * as http from 'http';

export class P2pClient {
    // If routing through toxiproxy, the toxiproxy hostname is toxiproxy-<nodeId>, listening on 8474
    // If direct, the hostname is ztan-<nodeId>, listening on 8080
    static async sendPrepare(targetNodeId: string, prepareMsg: PrepareMessage): Promise<boolean> {
        const hostname = process.env.ZTAN_USE_TOXIPROXY === 'true' 
            ? `toxiproxy-${targetNodeId}` 
            : `ztan-${targetNodeId}`;
        const port = process.env.ZTAN_USE_TOXIPROXY === 'true' ? 8474 : 8080;

        return new Promise((resolve) => {
            const req = http.request({
                hostname,
                port,
                path: '/rpc/prepare',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 500 // 500ms timeout for SLA limit
            }, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', (err) => {
                resolve(false);
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });

            req.write(JSON.stringify(prepareMsg));
            req.end();
        });
    }
}
