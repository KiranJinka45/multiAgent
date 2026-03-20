import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';
import { LeveldbPersistence } from 'y-leveldb';
import path from 'path';
import fs from 'fs-extra';

/**
 * Production-ready Collaboration server with LevelDB persistence.
 */
export function startCollaborationServer(port: number = 3011) {
    const persistenceDir = path.join(process.cwd(), 'data', 'yjs-persistence');
    fs.ensureDirSync(persistenceDir);
    
    const ldb = new LeveldbPersistence(persistenceDir);
    
    const wss = new WebSocketServer({ port, host: '0.0.0.0' });

    wss.on('connection', (conn, req) => {
        // extract docName from URL path (e.g. /room-name)
        const docName = req.url?.slice(1) || 'default';
        console.log(`[YJS] Connection established for room: ${docName}`);
        
        setupWSConnection(conn, req, {
            docName,
            gc: true,
            persistence: ldb
        });
    });

    console.log(`[YJS] Collaboration Server running on port ${port} with LevelDB persistence at ${persistenceDir}`);
    
    return wss;
}
