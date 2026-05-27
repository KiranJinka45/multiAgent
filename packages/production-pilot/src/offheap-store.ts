import * as fs from 'node:fs';
import * as path from 'node:path';

export interface IndexInfo {
    offset: number;
    length: number;
}

export class OffHeapIndexedStore {
    private filePath: string;
    private fd: number;
    private index = new Map<string, IndexInfo>();
    private writeOffset = 0;

    constructor(dir: string, filename: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.filePath = path.join(dir, filename);
        this.fd = fs.openSync(this.filePath, 'a+');
        this.writeOffset = fs.statSync(this.filePath).size;
        
        this.rebuildIndex();
    }

    private rebuildIndex(): void {
        const size = this.writeOffset;
        if (size === 0) return;

        // Synchronously scan file to build offset index map
        const buffer = fs.readFileSync(this.filePath);
        let pos = 0;
        
        while (pos < size) {
            if (pos + 4 > size) break;
            const length = buffer.readUInt32BE(pos);
            pos += 4;

            if (pos + length > size) break;
            
            const recordStr = buffer.toString('utf8', pos, pos + length);
            try {
                const record = JSON.parse(recordStr);
                const key = record.key;
                if (key) {
                    this.index.set(key, { offset: pos, length });
                }
            } catch (err) {
                // Ignore corrupt entry
            }
            pos += length;
        }
    }

    public put(key: string, value: any): void {
        const record = { key, value };
        const serialized = JSON.stringify(record);
        const buffer = Buffer.from(serialized, 'utf8');
        
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(buffer.length, 0);

        // Atomic sequential writes
        fs.writeSync(this.fd, lenBuf, 0, 4, this.writeOffset);
        this.writeOffset += 4;
        
        fs.writeSync(this.fd, buffer, 0, buffer.length, this.writeOffset);
        
        this.index.set(key, { offset: this.writeOffset, length: buffer.length });
        this.writeOffset += buffer.length;
        
        fs.fsyncSync(this.fd);
    }

    public get(key: string): any | null {
        const posInfo = this.index.get(key);
        if (!posInfo) return null;

        const buffer = Buffer.alloc(posInfo.length);
        fs.readSync(this.fd, buffer, 0, posInfo.length, posInfo.offset);
        
        try {
            const record = JSON.parse(buffer.toString('utf8'));
            return record.value;
        } catch (err) {
            return null;
        }
    }

    public keys(): string[] {
        return Array.from(this.index.keys());
    }

    public close(): void {
        if (this.fd) {
            fs.closeSync(this.fd);
        }
    }
}

export class LRUCache<K, V> {
    private cache = new Map<K, V>();
    constructor(private readonly maxCapacity = 100) {}

    public get(key: K): V | undefined {
        if (!this.cache.has(key)) return undefined;
        const val = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, val);
        return val;
    }

    public put(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxCapacity) {
            const lruKey = this.cache.keys().next().value;
            if (lruKey !== undefined) {
                this.cache.delete(lruKey);
            }
        }
        this.cache.set(key, value);
    }

    public clear(): void {
        this.cache.clear();
    }
}
