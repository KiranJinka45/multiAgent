import crypto from 'crypto';

export interface VirtualFile {
    path: string;
    content: string;
    hash: string;
    isDirty: boolean; // True if modified since last commit
    agentId?: string; // ID of the agent that last modified this file
    lastModified?: string;
}

export class VirtualFileSystem {
    private tree: Map<string, VirtualFile> = new Map();
    
    isEmpty(): boolean {
        return this.tree.size === 0;
    }

    /**
     * Initializes the VFS from an array of existing files.
     */
    loadFromDiskState(files: { path: string; content: string }[]) {
        this.tree.clear();
        for (const f of files) {
            this.setFile(f.path, f.content, false);
        }
    }

    /**
     * Retrieves a file by exact path.
     */
    getFile(path: string): VirtualFile | undefined {
        // Normalise path (remove leading slash if present)
        const normalized = path.replace(/^\//, '');
        return this.tree.get(normalized);
    }

    /**
     * Set or overwrite file content in the VFS.
     * Only marks as dirty if the content hash actually changes.
     */
    setFile(path: string, content: string, forceDirty: boolean = true, agentId?: string) {
        const normalized = path.replace(/^\//, '');
        const existing = this.tree.get(normalized);
        const newHash = this.generateHash(content);

        let isDirty = forceDirty;
        if (existing && existing.hash === newHash) {
            isDirty = false; // The content hasn't changed, don't mark as dirty
        }

        this.tree.set(normalized, {
            path: normalized,
            content,
            hash: newHash,
            isDirty: isDirty || (existing ? existing.isDirty : false),
            agentId: agentId || (existing ? existing.agentId : undefined),
            lastModified: new Date().toISOString()
        });
    }

    /**
     * Delete a file from the VFS.
     */
    deleteFile(path: string) {
        const normalized = path.replace(/^\//, '');
        this.tree.delete(normalized);
    }

    /**
     * Retrieve all files currently in the VFS.
     */
    getAllFiles(): VirtualFile[] {
        return Array.from(this.tree.values());
    }

    /**
     * Retrieve ONLY the files that have been modified since load.
     */
    getDirtyFiles(): VirtualFile[] {
        return this.getAllFiles().filter(f => f.isDirty);
    }

    /**
     * Generates a snapshot of the current tree for rollback capability.
     */
    createSnapshot(): string {
        return JSON.stringify(Array.from(this.tree.entries()));
    }

    /**
     * Restores the tree from a previously created snapshot.
     */
    restoreSnapshot(snapshot: string) {
        const entries = JSON.parse(snapshot);
        this.tree = new Map(entries);
    }

    /**
     * Generates an SHA-256 hash for deterministic validation.
     */
    private generateHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
}
