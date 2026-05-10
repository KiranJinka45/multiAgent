import * as fs from 'fs';
import * as path from 'path';
import { ThresholdBls } from '../src/ztan-bls';

async function verifyVectors() {
    const inputPath = path.join(__dirname, '../test-vectors.json');
    const outputPath = path.join(__dirname, '../node-results.json');
    
    if (!fs.existsSync(inputPath)) {
        console.error("Test vectors not found. Run generate-test-vectors.ts first.");
        process.exit(1);
    }

    const vectors = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const results = [];

    console.log(`Processing ${vectors.length} vectors in Node.js...`);

    for (const v of vectors) {
        try {
            const signature = await ThresholdBls.signShare(
                v.messageHash,
                v.secretShare,
                v.ceremonyId,
                v.threshold,
                v.eligiblePublicKeys
            );
            results.push({ id: v.id, signature });
        } catch (e: any) {
            console.error(`Error on vector ${v.id}:`, e.message);
            results.push({ id: v.id, error: e.message });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`✅ Node results saved to ${outputPath}`);
}

verifyVectors();
