import { WebSocketServer } from 'ws';
// @ts-expect-error - y-websocket doesn't have official types for bin/utils
import { setupWSConnection } from 'y-websocket/bin/utils';
import { collaborationPersistence } from './collaboration-persistence';
import { logger } from '@packages/observability';
import url from 'url';

/**
 * Production-ready Collaboration server with LevelDB persistence.
 */
export function startCollaborationServer(port: number = 3011) {
    const wss = new WebSocketServer({ port, host: '0.0.0.0' });

    wss.on('connection', (conn, req) => {
        const parsedUrl = url.parse(req.url || '/', true);
        const docName = parsedUrl.pathname?.slice(1) || 'default';
        
        logger.info({ docName, remoteAddress: req.socket.remoteAddress }, '[YJS] Connection established');
        
        setupWSConnection(conn, req, {
            docName,
            gc: true,
            persistence: collaborationPersistence
        });
    });

    logger.info({ port }, '[YJS] Collaboration Server running with Postgres persistence');
    
    return wss;
}

