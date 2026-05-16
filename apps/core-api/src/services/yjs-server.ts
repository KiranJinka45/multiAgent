import { Server } from 'socket.io';
import { logger } from '@packages/observability';
import * as Y from 'yjs';
import { collaborationPersistence } from './collaboration-persistence.js';

export class YjsServer {
  private io: Server;
  private docs: Map<string, Y.Doc> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket) => {
      socket.on('sync', async ({ docId, update }: { docId: string, update: Uint8Array }) => {
        let doc = this.docs.get(docId);
        if (!doc) {
          doc = new Y.Doc();
          const persisted = await collaborationPersistence.load(docId);
          if (persisted) Y.applyUpdate(doc, persisted);
          this.docs.set(docId, doc);
        }

        Y.applyUpdate(doc, update);
        await collaborationPersistence.save(docId, Y.encodeStateAsUpdate(doc));
        
        socket.broadcast.emit('sync', { docId, update });
      });
    });
  }
}
