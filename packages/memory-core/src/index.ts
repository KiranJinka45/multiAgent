export interface MemoryEntry {
    type: 'error' | 'fix' | 'pattern' | 'project';
    content: string;
    metadata?: unknown;
    projectId?: string;
}

export interface IMemoryService {
    store(entry: MemoryEntry, tenantId: string): Promise<unknown>;
    retrieve(query: string, tenantId: string, limit?: number): Promise<unknown[]>;
    getRecentFixes(errorPattern: string, tenantId: string): Promise<unknown[]>;
}

