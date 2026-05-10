import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';

async function generateArchive() {
    console.log("--- Generating Cryptographically Sealed Institutional Archive ---");

    // In a real system, we'd load this from a DB or log file
    const federation = (global as any).fed || new WitnessFederation([], 0); 
    
    const archiveData = {
        timestamp: new Date().toISOString(),
        governanceLog: federation.getGovernanceLog(),
        governanceRoot: federation.getGovernanceRoot(),
        constitution: fs.readFileSync(path.join(__dirname, '../CONSTITUTION.md'), 'utf8'),
        metadata: {
            epoch: federation.getEpochId(),
            institution: "ZTAN Sovereign Protocol"
        }
    };

    const archiveJson = JSON.stringify(archiveData, null, 2);
    const archiveHash = crypto.createHash('sha256').update(archiveJson).digest('hex');
    
    const archivePath = path.join(__dirname, '../archives/institutional_archive_current.json');
    if (!fs.existsSync(path.dirname(archivePath))) fs.mkdirSync(path.dirname(archivePath));
    
    fs.writeFileSync(archivePath, archiveJson);
    
    console.log(`\nArchive Generated: ${archivePath}`);
    console.log(`Archive Seal (SHA-256): ${archiveHash}`);
    console.log("\n✅ INSTITUTIONAL ARCHIVE SEALED!");
    
    return archiveHash;
}

generateArchive().catch(err => {
    console.error("Archive Generation Failed:", err);
    process.exit(1);
});
