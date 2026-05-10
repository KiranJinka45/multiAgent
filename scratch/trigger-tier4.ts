import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';

const WITNESS_POOL = [
    'http://localhost:8081/witness/receipt',
    'http://localhost:8082/witness/receipt',
    'http://localhost:8083/witness/receipt'
];
const TRACE_DIR = path.join(process.cwd(), '.ztan', 'trace');

async function sendToWitness(url: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = http.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Failed to parse witness response from ${url}: ${body}`));
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    if (!fs.existsSync(TRACE_DIR)) fs.mkdirSync(TRACE_DIR, { recursive: true });

    const missionId = 'FEDERATED_TEST_' + Date.now();
    const traceFile = path.join(TRACE_DIR, `${missionId}.trace.json`);

    console.log(`[TEST] Starting Federated Witness test mission: ${missionId}`);

    const fixedTime = "2026-05-08T12:00:00.000Z";
    const e1Hash = crypto.createHash('sha256').update("e1").digest('hex');
    const events = [
        { id: "e1", missionId, type: "START", timestamp: fixedTime, payload: {}, metadata: { timestamp: fixedTime }, previousHash: "0".repeat(64), eventHash: e1Hash },
        { id: "e2", missionId, type: "ACTION", timestamp: fixedTime, payload: { detail: "Testing Federated Quorum" }, metadata: { timestamp: fixedTime }, previousHash: e1Hash, eventHash: crypto.createHash('sha256').update("e2").digest('hex') }
    ];

    const payload = {
        missionId,
        chainRoot: crypto.createHash('sha256').update('root').digest('hex'),
        tailHash: crypto.createHash('sha256').update(JSON.stringify(events)).digest('hex'),
        governanceReceipt: 'test-gov',
        signerKeyId: 'test-signer',
        timestamp: fixedTime
    };

    console.log(`[TEST] Collecting receipts from witness pool...`);
    const receipts: any[] = [];
    
    for (const url of WITNESS_POOL) {
        try {
            const receipt = await sendToWitness(url, payload);
            receipts.push(receipt);
            console.log(`  ✓ Received receipt from ${url} (Tree Size: ${receipt.treeSize})`);
        } catch (e: any) {
            console.warn(`  ✗ Failed to get receipt from ${url}: ${e.message}`);
        }
    }

    if (receipts.length === 0) {
        console.error('[FAIL] No receipts collected. Aborting.');
        return;
    }

    const traceData = {
        missionId,
        events,
        witnesses: receipts // Changed from single 'witness' to 'witnesses' array
    };

    fs.writeFileSync(traceFile, JSON.stringify(traceData, null, 2));
    console.log(`[TEST] Trace saved to ${traceFile} with ${receipts.length} witness receipts.`);
}

run().catch(console.error);
