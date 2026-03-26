export interface MemoryItem {
  key: string;
  value: any;
  timestamp: string;
  tags?: string[];
}

export class Memory {
  private store: Map<string, MemoryItem> = new Map();

  async store_context(key: string, value: any, tags?: string[]) {
    const item: MemoryItem = {
      key,
      value,
      timestamp: new Date().toISOString(),
      tags
    };
    this.store.set(key, item);
    console.log(`💾 [Brain] Stored context for key: ${key}`);
  }

  async retrieve_context(key: string): Promise<any | null> {
    const item = this.store.get(key);
    return item ? item.value : null;
  }

  async query_by_tag(tag: string): Promise<MemoryItem[]> {
    return Array.from(this.store.values()).filter(item => item.tags?.includes(tag));
  }

  clear() {
    this.store.clear();
  }
}
