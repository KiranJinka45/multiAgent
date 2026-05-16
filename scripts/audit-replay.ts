import fs from 'node:fs';
import path from 'node:path';

/**
 * ZTAN AUDIT REPLAY
 * 
 * Provides searchable indexing and compression for historical recovery replays:
 * - Replay Metadata Indexing (REPLAY_INDEX.json)
 * - Failure Sequence Search
 * - Environment Fingerprint Correlation
 * - Historical Cluster Persistence Tracking
 */

const REPLAY_DIR = path.join('archive', 'recovery_replays');
const INDEX_FILE = path.join(REPLAY_DIR, 'REPLAY_INDEX.json');

interface IndexEntry {
    timestamp: string;
    success: boolean;
    category?: string;
    os: string;
    node: string;
    durationMs: number;
    lockfileSize: number;
}

async function runAuditReplay() {
    console.log('🕵️  ZTAN AUDIT REPLAY INITIATED...');
    
    if (!fs.existsSync(REPLAY_DIR)) {
        console.error('No replay archive found.');
        return;
    }

    const index: IndexEntry[] = [];
    const replays = fs.readdirSync(REPLAY_DIR).filter(d => d !== 'REPLAY_INDEX.json');

    console.log(`   - Indexing ${replays.length} historical replays...`);

    for (const replay of replays) {
        const metaPath = path.join(REPLAY_DIR, replay, 'run_metadata.json');
        const lockPath = path.join(REPLAY_DIR, replay, 'pnpm-lock.yaml');
        
        if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            const lockSize = fs.existsSync(lockPath) ? fs.statSync(lockPath).size : 0;
            
            index.push({
                timestamp: meta.timestamp,
                success: meta.success,
                category: meta.failureCategory,
                os: meta.envFingerprint.os,
                node: meta.envFingerprint.node,
                durationMs: meta.durationMs,
                lockfileSize: lockSize
            });
        }
    }

    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    console.log(`✅ Audit Index generated: ${INDEX_FILE}`);

    // Basic Analysis: Cluster Persistence
    const categories = index.filter(i => !i.success).map(i => i.category);
    const persistence: Record<string, { firstSeen: string, lastSeen: string, count: number }> = {};
    
    index.filter(i => !i.success).forEach(i => {
        const cat = i.category || 'unknown';
        if (!persistence[cat]) {
            persistence[cat] = { firstSeen: i.timestamp, lastSeen: i.timestamp, count: 0 };
        }
        persistence[cat].count++;
        if (new Date(i.timestamp) < new Date(persistence[cat].firstSeen)) persistence[cat].firstSeen = i.timestamp;
        if (new Date(i.timestamp) > new Date(persistence[cat].lastSeen)) persistence[cat].lastSeen = i.timestamp;
    });

    console.log('\n📉 Failure Persistence Tracking:');
    Object.entries(persistence).forEach(([cat, stats]) => {
        const lifespanDays = (new Date(stats.lastSeen).getTime() - new Date(stats.firstSeen).getTime()) / (1000 * 60 * 60 * 24);
        console.log(`   - ${cat}: Active for ${lifespanDays.toFixed(1)} days (${stats.count} occurrences)`);
    });
}

runAuditReplay();
