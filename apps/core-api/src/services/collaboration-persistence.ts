import * as Y from 'yjs';
import { db as prisma } from '@packages/db';
import logger from '@packages/utils';

/**
 * CollaborationPersistence
 * 
 * Production-ready Yjs persistence using Postgres.
 * Handles loading initial document state and persisting incremental updates.
 */
export class CollaborationPersistence {
    /**
     * Binds a Yjs document to Postgres persistence.
     * Loads the initial state from DB if it exists.
     */
    async bindState(docName: string, ydoc: Y.Doc) {
        try {
            const doc = await prisma.collaborativeDoc.findUnique({
                where: { name: docName }
            });

            if (doc && doc.updates) {
                Y.applyUpdate(ydoc, doc.updates);
                logger.debug({ docName }, '[YJS:Persistence] Initial state loaded from Postgres');
            } else {
                logger.debug({ docName }, '[YJS:Persistence] No existing state found, starting fresh');
            }

            // Listen for updates and persist them
            ydoc.on('update', async (_update: Uint8Array) => {
                await this.storeUpdate(docName, ydoc);
            });
        } catch (err) {
            logger.error({ docName, err }, '[YJS:Persistence] Failed to bind document state');
        }
    }

    public async load(docName: string): Promise<Uint8Array | null> {
        const doc = await prisma.collaborativeDoc.findUnique({
            where: { name: docName }
        });
        return doc?.updates ? new Uint8Array(doc.updates) : null;
    }

    public async save(docName: string, update: Uint8Array): Promise<void> {
        await prisma.collaborativeDoc.upsert({
            where: { name: docName },
            update: { updates: Buffer.from(update) },
            create: { 
                name: docName, 
                updates: Buffer.from(update) 
            }
        });
    }

    /**
     * Merges current document state and persists to Postgres.
     */
    private async storeUpdate(docName: string, ydoc: Y.Doc) {
        try {
            const state = Y.encodeStateAsUpdate(ydoc);
            await this.save(docName, state);
        } catch (err) {
            logger.error({ docName, err }, '[YJS:Persistence] Failed to store document update');
        }
    }
}

export const collaborationPersistence = new CollaborationPersistence();
