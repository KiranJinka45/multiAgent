import { ReplayGuard } from './index';

/**
 * ELITE: Persistent File-backed Replay Guard
 * This class uses Node.js 'fs' and is intended for server-side use only.
 */
export class FileReplayGuard implements ReplayGuard {
  private dbPath: string;
  private cache = new Map<string, number>();

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.load();
  }

  private load() {
    try {
      // In Node.js, we can safely use require('fs') if this file is only used in Node.
      // However, to be extra safe with bundlers, we can use a dynamic import or just standard import.
      // Since this is a dedicated Node file, we use standard import if we were using ESM, 
      // but for widest compatibility in this monorepo, we'll use a standard Node pattern.
      const fs = require('fs');
      if (fs.existsSync(this.dbPath)) {
        const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
        this.cache = new Map(Object.entries(data));
      }
    } catch (e: any) {
      console.warn('[FileReplayGuard] Failed to load replay DB:', e.message);
    }
  }

  private save() {
    try {
      const fs = require('fs');
      const data = Object.fromEntries(this.cache.entries());
      fs.writeFileSync(this.dbPath, JSON.stringify(data));
    } catch (e: any) {
      console.error('[FileReplayGuard] Failed to save replay DB:', e.message);
    }
  }

  async isReplay(auditId: string): Promise<boolean> {
    const expiry = this.cache.get(auditId);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.cache.delete(auditId);
      this.save();
      return false;
    }
    return true;
  }

  async markSeen(auditId: string, ttlSeconds: number): Promise<void> {
    this.cache.set(auditId, Date.now() + (ttlSeconds * 1000));
    this.save();
  }
}
