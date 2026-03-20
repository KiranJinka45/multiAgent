export interface VirtualFile {
    path: string;
    content: string;
    encoding?: string;
}

export class VirtualFileSystem {
    private files: Map<string, VirtualFile> = new Map();

    writeFile(path: string, content: string, encoding: string = 'utf-8') {
        this.files.set(path, { path, content, encoding });
    }

    readFile(path: string): string | null {
        return this.files.get(path)?.content || null;
    }

    exists(path: string): boolean {
        return this.files.has(path);
    }

    createSnapshot(): [string, VirtualFile][] {
        return Array.from(this.files.entries());
    }

    restoreSnapshot(snapshot: [string, VirtualFile][]) {
        this.files = new Map(snapshot);
    }

    isEmpty(): boolean {
        return this.files.size === 0;
    }
}
