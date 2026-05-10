import * as fs from 'fs';
import * as path from 'path';
import { Canonical } from '../src/canonical';

function generateRandomHex(bytes: number): string {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Canonical.bytesToHex(arr);
}

function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const vectors = [];
for (let i = 0; i < 100; i++) {
    const n = 5;
    const t = Math.floor(Math.random() * n) + 1;
    const eligiblePks = Array.from({ length: n }, () => generateRandomHex(48)); // BLS G1 PK hex
    
    vectors.push({
        id: i,
        messageHash: generateRandomHex(32),
        secretShare: generateRandomHex(32),
        ceremonyId: generateRandomString(16),
        threshold: t,
        eligiblePublicKeys: eligiblePks
    });
}

const outputPath = path.join(__dirname, '../test-vectors.json');
fs.writeFileSync(outputPath, JSON.stringify(vectors, null, 2));
console.log(`✅ Generated 100 test vectors to ${outputPath}`);
