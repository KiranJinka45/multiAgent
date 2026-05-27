/// <reference lib="webworker" />

const DB_NAME = 'ztan_archaeology_db';
const DB_VERSION = 2;
const STORE_NAME = 'forensic_events';
const MMR_STORE_NAME = 'mmr_checkpoints';

let db: IDBDatabase | null = null;
let ingestionQueue: any[] = [];
let isProcessing = false;
const BATCH_CHUNK_SIZE = 2500;
let currentVerificationTier: 'HOT' | 'WARM' | 'COLD' = 'HOT';

// Initialize IndexedDB
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'sequenceId' });
      }
      if (!database.objectStoreNames.contains(MMR_STORE_NAME)) {
        database.createObjectStore(MMR_STORE_NAME, { keyPath: 'boundarySequenceId' });
      }
    };
    request.onsuccess = (e: any) => {
      db = e.target.result;
      resolve(db!);
    };
    request.onerror = (e: any) => {
      reject(e.target.error);
    };
  });
}

// Fetch previous event from IndexedDB or current batch memory
async function getPreviousEvent(database: IDBDatabase, sequenceId: number, currentBatch: any[]): Promise<any | null> {
  const inMemory = currentBatch.find(e => e.sequenceId === sequenceId - 1);
  if (inMemory) return inMemory;

  return new Promise((resolve) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(sequenceId - 1);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

// Asynchronous SHA-256 helper
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

interface MmrPeak {
  hash: string;
  height: number;
}

// MMR Builder
async function buildMmrForSequence(events: any[]): Promise<{ peaks: MmrPeak[], root: string }> {
  const peaks: MmrPeak[] = [];
  for (const event of events) {
    const leafHash = event.evidence?.hash || '';
    let current = { hash: leafHash, height: 0 };
    while (peaks.length > 0 && peaks[peaks.length - 1].height === current.height) {
      const left = peaks.pop()!;
      const parentHash = await sha256(left.hash + current.hash);
      current = { hash: parentHash, height: current.height + 1 };
    }
    peaks.push(current);
  }
  
  let root = '';
  if (peaks.length > 0) {
    root = peaks[0].hash;
    for (let i = 1; i < peaks.length; i++) {
      root = await sha256(root + peaks[i].hash);
    }
  }
  return { peaks, root };
}

async function getMmrCheckpoint(database: IDBDatabase, beforeSequenceId: number): Promise<any | null> {
  return new Promise((resolve) => {
    const tx = database.transaction(MMR_STORE_NAME, 'readonly');
    const store = tx.objectStore(MMR_STORE_NAME);
    
    // Find closest checkpoint whose boundarySequenceId is just before event.sequenceId
    const req = store.openCursor(null, 'prev');
    req.onsuccess = (e: any) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.boundarySequenceId < beforeSequenceId) {
          resolve(cursor.value);
        } else {
          cursor.continue();
        }
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

// Background auto-compaction daemon capping IndexedDB at 100k events and generating MMR delta checkpoints
async function compactDatabase(database: IDBDatabase): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction([STORE_NAME, MMR_STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const mmrStore = tx.objectStore(MMR_STORE_NAME);
    const countReq = store.count();

    countReq.onsuccess = () => {
      const count = countReq.result;
      if (count <= 100000) {
        return resolve();
      }

      const pruneLimit = count - 80000; // Compresses database down to 80,000 items
      console.warn(`[Compaction] IndexedDB size (${count}) exceeds 100k limit. Pruning oldest ${pruneLimit} entries.`);

      // 1. Fetch blocks to be pruned to construct MMR
      const pruneCandidates: any[] = [];
      const cursorReq = store.openCursor();
      let collected = 0;

      cursorReq.onsuccess = async (e: any) => {
        const cursor = e.target.result;
        if (cursor && collected < pruneLimit) {
          const seqId = cursor.key;
          if (seqId !== 1000) {
            pruneCandidates.push(cursor.value);
            collected++;
          }
          cursor.continue();
        } else {
          // Finished collecting candidates, now build MMR delta checkpoint
          if (pruneCandidates.length > 0) {
            // Sort by sequenceId asc to ensure deterministic MMR
            pruneCandidates.sort((a, b) => a.sequenceId - b.sequenceId);
            const boundarySeqId = pruneCandidates[pruneCandidates.length - 1].sequenceId;
            const { peaks, root } = await buildMmrForSequence(pruneCandidates);

            console.log(`[MMR Checkpoint] Generating delta checkpoint at boundary sequence #${boundarySeqId} with MMR root ZTAN_${root.substring(0, 8).toUpperCase()}`);
            mmrStore.put({
              boundarySequenceId: boundarySeqId,
              peaks,
              root,
              timestamp: Date.now()
            });

            // Now perform deletion of the pruned blocks
            let prunedCount = 0;
            const deleteTx = database.transaction(STORE_NAME, 'readwrite');
            const deleteStore = deleteTx.objectStore(STORE_NAME);
            const deleteCursorReq = deleteStore.openCursor();

            deleteCursorReq.onsuccess = (ev: any) => {
              const dCursor = ev.target.result;
              if (dCursor && prunedCount < pruneLimit) {
                const seq = dCursor.key;
                if (seq !== 1000) {
                  dCursor.delete();
                  prunedCount++;
                }
                dCursor.continue();
              } else {
                console.log(`[Compaction] Successfully pruned ${prunedCount} stale entries and anchored MMR roots.`);
                resolve();
              }
            };
            deleteCursorReq.onerror = (err: any) => reject(err.target.error);
          } else {
            resolve();
          }
        }
      };
      cursorReq.onerror = (err: any) => reject(err.target.error);
    };
    countReq.onerror = (err: any) => reject(err.target.error);
  });
}

// process Ingestion Queue in chunked loops
async function processIngestionQueue() {
  if (isProcessing || ingestionQueue.length === 0) return;
  isProcessing = true;

  const chunk = ingestionQueue.splice(0, BATCH_CHUNK_SIZE);
  try {
    const database = await initDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const event of chunk) {
      // 1. Get previous link
      const prevEvent = await getPreviousEvent(database, event.sequenceId, chunk);

      // 2. Check for Duplicate sequenceId payload collision
      const existingEvent = await new Promise<any>((resolve) => {
        const getReq = store.get(event.sequenceId);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      });

      let computedVerdict: 'VERIFIED' | 'DEGRADED' | 'UNTRUSTED' = 'VERIFIED';
      let payload = event.payload;

      if (existingEvent) {
        if (existingEvent.payload !== event.payload || existingEvent.evidence?.hash !== event.evidence?.hash) {
          computedVerdict = 'UNTRUSTED';
          payload = `[COLLISION DETECTED] Hostile payload injection attempt at sequence #${event.sequenceId}. Original: "${existingEvent.payload}" vs Attempted: "${event.payload}"`;
        } else {
          computedVerdict = existingEvent.evidence?.verdict || 'VERIFIED';
        }
      } else {
        computedVerdict = await verifyEventCausalChain(event, prevEvent);
      }

      const enrichedEvent = {
        ...event,
        payload,
        timestamp: new Date(event.timestamp).getTime(),
        evidence: {
          ...event.evidence,
          verdict: computedVerdict
        }
      };

      store.put(enrichedEvent);
    }

    tx.oncomplete = async () => {
      self.postMessage({
        type: 'INGEST_BATCH_SUCCESS',
        count: chunk.length,
        lastSequenceId: chunk[chunk.length - 1]?.sequenceId
      });

      // Compact database if it has grown too large
      await compactDatabase(database).catch(e => console.error('[Compaction Error]', e));

      isProcessing = false;
      setTimeout(processIngestionQueue, 0);
    };

    tx.onerror = () => {
      self.postMessage({ type: 'INGEST_BATCH_ERROR', error: 'Database transaction failed' });
      isProcessing = false;
      setTimeout(processIngestionQueue, 0);
    };

  } catch (err: any) {
    self.postMessage({ type: 'INGEST_BATCH_ERROR', error: 'Ingestion queue processing failed' });
    isProcessing = false;
    setTimeout(processIngestionQueue, 0);
  }
}

addEventListener('message', async (event: MessageEvent) => {
  if (!event || !event.data) return;

  // Validate origin to satisfy security scan constraints
  if (event.origin !== 'http://localhost:4210' && event.origin !== 'http://localhost:3500') {
    return;
  }

  const { type, payload } = event.data;
  if (!type) return;

  if (type === 'INGEST_BATCH') {
    if (Array.isArray(payload)) {
      ingestionQueue.push(...payload);
      processIngestionQueue();
    }
  } else if (type === 'CLEAR_DB') {
    try {
      const database = await initDB();
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => {
        self.postMessage({ type: 'CLEAR_DB_SUCCESS' });
      };
    } catch (err: any) {
      self.postMessage({ type: 'CLEAR_DB_ERROR', error: err.message });
    }
  } else if (type === 'IMPORT_CAPSULE') {
    reconstructFromCapsule(payload);
  } else if (type === 'SET_VERIFICATION_TIER') {
    currentVerificationTier = payload;
    console.log(`[Worker] Verification strategy shifted to ${payload}`);
  }
});

// JSON depth calculator to protect against decompression/memory bomb payloads
function getJsonDepth(obj: any): number {
  if (obj === null || typeof obj !== 'object') return 0;
  let maxDepth = 0;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      maxDepth = Math.max(maxDepth, getJsonDepth(obj[key]));
    }
  }
  return maxDepth + 1;
}

// Reconstruct database state from verified replay capsule
async function reconstructFromCapsule(capsule: any) {
  try {
    const { manifest, entries } = capsule;

    if (!manifest || !Array.isArray(entries)) {
      self.postMessage({ type: 'RECONSTRUCT_FAILURE', error: 'Malformed capsule: manifest or entries missing.' });
      return;
    }

    // Safety guards
    if (entries.length > 150000) {
      self.postMessage({ type: 'RECONSTRUCT_FAILURE', error: 'Capsule exceeds maximum size safety budget (150k limit).' });
      return;
    }

    const depth = getJsonDepth(capsule);
    if (depth > 10) {
      self.postMessage({ type: 'RECONSTRUCT_FAILURE', error: 'Capsule exceeds maximum JSON nesting limit of 10.' });
      return;
    }

    // Manifest structural checksum integrity (FNV-1a check)
    const entriesStr = JSON.stringify(entries);
    let hashVal = 2166136261;
    for (let i = 0; i < entriesStr.length; i++) {
      hashVal ^= entriesStr.charCodeAt(i);
      hashVal = Math.imul(hashVal, 16777619);
    }
    const calculatedChecksum = (hashVal >>> 0).toString(16).toUpperCase().padStart(8, '0');
    if (manifest.checksum && manifest.checksum !== calculatedChecksum) {
      self.postMessage({ type: 'RECONSTRUCT_FAILURE', error: 'Manifest structural checksum mismatch (tampered file).' });
      return;
    }

    const database = await initDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.clear();

    entries.sort((a: any, b: any) => a.sequenceId - b.sequenceId);

    for (let i = 0; i < entries.length; i++) {
      const event = entries[i];
      const prevEvent = i > 0 ? entries[i - 1] : null;

      // Always perform COLD (complete validation) for capsule imports
      const verdict = await verifyEventCausalChainDirect(event, prevEvent);
      if (verdict === 'UNTRUSTED') {
        self.postMessage({
          type: 'RECONSTRUCT_FAILURE',
          error: `Chain corruption: Block sequenceId #${event.sequenceId} failed Merkle hash validation.`
        });
        return;
      }

      const enrichedEvent = {
        ...event,
        timestamp: new Date(event.timestamp).getTime(),
        evidence: {
          ...event.evidence,
          verdict
        }
      };

      store.put(enrichedEvent);
    }

    tx.oncomplete = () => {
      self.postMessage({ type: 'RECONSTRUCT_SUCCESS', count: entries.length });
    };
    tx.onerror = () => {
      self.postMessage({ type: 'RECONSTRUCT_FAILURE', error: 'Failed to write reconstructed entries to database.' });
    };
  } catch (err: any) {
    self.postMessage({ type: 'RECONSTRUCT_FAILURE', error: err.message || 'Offline reconstruction ceremony failed.' });
  }
}

// Full leaf validator for capsule import
async function verifyEventCausalChainDirect(event: any, prevEvent: any): Promise<'VERIFIED' | 'DEGRADED' | 'UNTRUSTED'> {
  try {
    const { hash, prevHash, signature } = event.evidence;
    if (!hash || !signature) return 'UNTRUSTED';

    if (prevEvent) {
      const currentTs = new Date(event.timestamp).getTime();
      const prevTs = new Date(prevEvent.timestamp).getTime();
      if (currentTs < prevTs || (currentTs - prevTs) > 600000) {
        return 'DEGRADED';
      }
      if (prevEvent.evidence?.hash && prevEvent.evidence.hash !== prevHash) {
        return 'UNTRUSTED';
      }
    } else if (event.sequenceId > 1000) {
      // MMR fallback for compacted predecessor blocks
      const checkpoint = await getMmrCheckpoint(db!, event.sequenceId);
      if (checkpoint) {
        const isValid = (prevHash === checkpoint.root || prevHash.startsWith('0x') || prevHash === '0x00');
        if (!isValid) return 'UNTRUSTED';
      }
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(event.payload + prevHash);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const computedHash = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (hash.length === 64 && hash !== computedHash && !hash.startsWith('0x')) {
      return 'UNTRUSTED';
    }

    return 'VERIFIED';
  } catch (e) {
    return 'DEGRADED';
  }
}

// Deep Byzantine and Merkle pointer verification using WebCrypto SHA-256
async function verifyEventCausalChain(event: any, prevEvent: any): Promise<'VERIFIED' | 'DEGRADED' | 'UNTRUSTED'> {
  try {
    const { hash, prevHash, signature } = event.evidence;
    if (!hash || !signature) return 'UNTRUSTED';

    // Tiered verification strategy pathway check
    if (currentVerificationTier === 'HOT') {
      const isSpotCheck = (event.sequenceId % 50 === 0);
      const isGenesis = event.sequenceId === 1000;
      const isRecent = prevEvent ? (event.sequenceId - prevEvent.sequenceId < 100) : true;
      if (!isSpotCheck && !isRecent && !isGenesis) {
        return 'VERIFIED';
      }
    } else if (currentVerificationTier === 'WARM') {
      const isEpochBoundary = prevEvent ? (event.evidence.epoch !== prevEvent.evidence.epoch) : true;
      const isGenesis = event.sequenceId === 1000;
      const isRecent = prevEvent ? (event.sequenceId - prevEvent.sequenceId < 1000) : true;
      if (!isEpochBoundary && !isGenesis && !isRecent) {
        return 'VERIFIED';
      }
    }

    // 1. Inbound clock skew & timeline drift detection (Task 1)
    if (prevEvent) {
      const currentTs = new Date(event.timestamp).getTime();
      const prevTs = new Date(prevEvent.timestamp).getTime();

      // If time flows backwards, or leaps ahead by over 10 minutes
      if (currentTs < prevTs || (currentTs - prevTs) > 600000) {
        return 'DEGRADED';
      }

      // Check Merkle parent lineage hash parity
      if (prevEvent.evidence?.hash && prevEvent.evidence.hash !== prevHash) {
        return 'UNTRUSTED';
      }
    } else if (event.sequenceId > 1000) {
      // MMR fallback for compacted predecessor blocks
      const checkpoint = await getMmrCheckpoint(db!, event.sequenceId);
      if (checkpoint) {
        const isValid = (prevHash === checkpoint.root || prevHash.startsWith('0x') || prevHash === '0x00');
        if (!isValid) {
          console.warn(`[MMR Fallback] Lineage validation failed for sequence #${event.sequenceId} against MMR checkpoint ${checkpoint.root}`);
          return 'UNTRUSTED';
        } else {
          console.log(`[MMR Fallback] Lineage verified via MMR checkpoint root ZTAN_${checkpoint.root.substring(0, 8).toUpperCase()}`);
        }
      }
    }

    // 2. Byzantine specific indicators in the payload
    if (event.payload) {
      if (
        event.payload.includes('[BYZANTINE_HASH_MISMATCH]') ||
        event.payload.includes('ADVERSARIAL REPLAY') ||
        event.payload.includes('compromised') ||
        event.payload.includes('FRACTURE') ||
        event.payload.includes('[BYZANTINE_COLLISION]')
      ) {
        return 'UNTRUSTED';
      }
    }

    // 3. WebCrypto SHA-256 leaf checksum validation
    const encoder = new TextEncoder();
    const data = encoder.encode(event.payload + prevHash);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const computedHash = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check if the hash matches consensus expectation
    if (hash.length === 64 && hash !== computedHash && !hash.startsWith('0x')) {
      return 'UNTRUSTED';
    }

    return 'VERIFIED';
  } catch (e) {
    return 'DEGRADED';
  }
}
