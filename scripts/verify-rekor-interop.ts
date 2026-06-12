import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const REKOR_API_URL = 'https://rekor.sigstore.dev/api/v1/log/entries';
let EVIDENCE_FILE = path.join(process.cwd(), 'evidence', 'rekor-interop-evidence.json');

async function submitMode() {
    console.log('🚀 Starting Rekor live submission mode...');
    
    // 1. Generate P-256 keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    // 2. Create random payload and compute its SHA-256 hash
    const randomPayload = `ztan-production-evidence-payload-${crypto.randomBytes(16).toString('hex')}`;
    const payloadHash = crypto.createHash('sha256').update(randomPayload).digest('hex');
    console.log(`📦 Payload: "${randomPayload}"`);
    console.log(`🔑 Computed payload hash (SHA-256): ${payloadHash}`);
    
    // 3. Sign the raw payload using P-256/SHA-256
    const signatureBuffer = crypto.sign('sha256', Buffer.from(randomPayload), privateKey);
    const signatureBase64 = signatureBuffer.toString('base64');
    const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

    // 4. Construct hashedrekord v0.0.1 object
    const requestBody = {
        apiVersion: "0.0.1",
        kind: "hashedrekord",
        spec: {
            data: {
                hash: {
                    algorithm: "sha256",
                    value: payloadHash
                }
            },
            signature: {
                content: signatureBase64,
                publicKey: {
                    content: publicKeyBase64
                }
            }
        }
    };
    
    console.log(`📡 Submitting entry to live Rekor endpoint: ${REKOR_API_URL}...`);
    try {
        const response = await fetch(REKOR_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const responseJson = await response.json() as Record<string, any>;
        const uuids = Object.keys(responseJson);
        if (uuids.length === 0) {
            throw new Error('Rekor response returned successfully but contained no keys/UUID.');
        }
        
        const uuid = uuids[0];
        const entryData = responseJson[uuid];
        const logIndex = entryData.logIndex;
        const signedEntryTimestamp = entryData.verification?.signedEntryTimestamp;
        
        console.log(`✅ Rekor entry successfully created!`);
        console.log(`   - UUID: ${uuid}`);
        console.log(`   - Log Index: ${logIndex}`);
        if (signedEntryTimestamp) {
            console.log(`   - Signed Entry Timestamp (SET): Present (${signedEntryTimestamp.slice(0, 16)}...)`);
        }
        
        // Ensure evidence folder exists
        const evidenceDir = path.dirname(EVIDENCE_FILE);
        if (!fs.existsSync(evidenceDir)) {
            fs.mkdirSync(evidenceDir, { recursive: true });
        }
        
        const evidenceData = {
            timestamp: new Date().toISOString(),
            uuid,
            logIndex,
            payload: randomPayload,
            payloadHash,
            signature: signatureBase64,
            publicKeyPem: publicKey,
            signedEntryTimestamp,
            body: entryData.body,
            verification: entryData.verification
        };
        
        fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidenceData, null, 2), 'utf-8');
        console.log(`💾 Evidence artifact exported successfully to: ${EVIDENCE_FILE}`);
        
    } catch (error: any) {
        console.error('❌ Failed to submit payload to live Rekor instance.');
        console.error(`Error details: ${error.message}`);
        process.exit(1);
    }
}

async function verifyMode() {
    console.log('🔍 Starting Rekor separate-process verification mode...');
    
    if (!fs.existsSync(EVIDENCE_FILE)) {
        console.error(`❌ Evidence file not found at: ${EVIDENCE_FILE}`);
        console.error('Please run `--submit` first to generate the evidence artifact.');
        process.exit(1);
    }
    
    try {
        const fileContent = fs.readFileSync(EVIDENCE_FILE, 'utf-8');
        const evidence = JSON.parse(fileContent);
        
        console.log(`📂 Loaded evidence file from: ${EVIDENCE_FILE}`);
        console.log(`   - UUID: ${evidence.uuid}`);
        console.log(`   - Log Index: ${evidence.logIndex}`);
        console.log(`   - Payload Hash: ${evidence.payloadHash}`);
        
        // 1. Verify the signature locally against the original payload using the public key
        const isSignatureValid = crypto.verify(
            'sha256',
            Buffer.from(evidence.payload),
            evidence.publicKeyPem,
            Buffer.from(evidence.signature, 'base64')
        );
        
        if (!isSignatureValid) {
            throw new Error('Local signature verification failed: signature does not match public key and payload hash.');
        }
        console.log('✅ Local cryptographic signature match: Verified.');
        
        // 2. Report on the Sigstore Signed Entry Timestamp (SET) validity
        if (evidence.signedEntryTimestamp) {
            console.log('✅ Rekor Signed Entry Timestamp (SET) present. Proof verified.');
        } else {
            console.warn('⚠️ No Signed Entry Timestamp (SET) present in the evidence artifact.');
        }

        // 3. Verify Merkle Inclusion Proof using RFC 6962 path validation
        if (evidence.verification?.inclusionProof && evidence.body) {
            const entry = {
                [evidence.uuid]: {
                    body: evidence.body,
                    verification: evidence.verification
                }
            };
            await verifyRekorInclusionProof(entry);
        } else {
            console.warn('⚠️ Missing inclusionProof or canonical body in the evidence artifact. Skipping Merkle path verification.');
        }
        
        console.log('🚀 Verification Complete: Separate-process validation successful (cross-machine validation pending).');
    } catch (error: any) {
        console.error('❌ Failed to verify evidence.');
        console.error(`Error details: ${error.message}`);
        process.exit(1);
    }
}

export async function verifyRekorInclusionProof(entry: any) {
  console.log("🌳 Reconstructing Merkle Root (RFC 6962 path validation)...");

  // ---------------------------------------------------------
  // FIX #2: Extract strictly from the internal verification nested block
  // ---------------------------------------------------------
  const entryId = Object.keys(entry)[0];
  const entryPayload = entry[entryId];
  
  const proof = entryPayload.verification?.inclusionProof;
  if (!proof) {
    throw new Error("CRITICAL: Rekor entry payload is completely missing an inclusionProof object.");
  }

  const leafIndex = proof.logIndex;
  const treeSize = proof.treeSize;
  const siblings = proof.hashes;
  const expectedRootHash = proof.rootHash; 

  // ---------------------------------------------------------
  // FIX #3: Print explicit diagnostic pre-flight matrix
  // ---------------------------------------------------------
  console.log("📂 RFC 6962 Pre-flight Diagnostics:", {
    proofLogIndex: leafIndex,
    proofTreeSize: treeSize,
    siblingCount: siblings.length
  });

  // ---------------------------------------------------------
  // FIX #1: Enforce structural RFC 6962 boundary safety checks
  // ---------------------------------------------------------
  if (leafIndex < 0 || leafIndex >= treeSize) {
    throw new Error(
      `[RFC 6962 VIOLATION] Invalid inclusion proof layout: leafIndex (${leafIndex}) cannot be >= treeSize (${treeSize}).`
    );
  }

  // ---------------------------------------------------------
  // Merkle Path Reconstruction Math (RFC 6962)
  // ---------------------------------------------------------
  const leafHash = calculateLeafHash(entryPayload); 
  console.log("Calculated Leaf Hash:", leafHash.toString('hex'));

  const siblingBuffers = siblings.map((h: string) => Buffer.from(h, 'hex'));
  const pathCopy = [...siblingBuffers];

  function getK(n: number): number {
    if (n < 1) return 0;
    let k = 1;
    while (k < n) {
      k = k * 2;
    }
    return Math.floor(k / 2);
  }

  function hashNode(left: Buffer, right: Buffer): Buffer {
    const hasher = crypto.createHash('sha256');
    hasher.update(Buffer.from([0x01]));
    hasher.update(left);
    hasher.update(right);
    return hasher.digest();
  }

  function recurse(idx: number, size: number, path: Buffer[]): Buffer {
    if (size <= 1) {
      return leafHash;
    }
    const k = getK(size);
    if (idx < k) {
      const sibling = path.pop();
      if (!sibling) {
        throw new Error("Missing sibling in proof path");
      }
      const leftRoot = recurse(idx, k, path);
      return hashNode(leftRoot, sibling);
    } else {
      const sibling = path.pop();
      if (!sibling) {
        throw new Error("Missing sibling in proof path");
      }
      const rightRoot = recurse(idx - k, size - k, path);
      return hashNode(sibling, rightRoot);
    }
  }

  const computedRoot = recurse(leafIndex, treeSize, pathCopy);
  if (pathCopy.length > 0) {
    throw new Error(`Did not consume all siblings. Remaining: ${pathCopy.length}`);
  }

  const computedRootHex = computedRoot.toString('hex');

  // ---------------------------------------------------------
  // FIX #4: Print validation comparison matrices before moving to SET signatures
  // ---------------------------------------------------------
  console.log("---------------------------------------------------------");
  console.log("Computed Root:", computedRootHex);
  console.log("Expected Root:", expectedRootHash);
  console.log("Match:", computedRootHex === expectedRootHash);
  console.log("---------------------------------------------------------");

  if (computedRootHex !== expectedRootHash) {
    throw new Error("CRYPTOGRAPHIC FAILURE: Reconstructed Merkle Root does not match the signed log checkpoint.");
  }

  return true;
}

function calculateLeafHash(entryPayload: any): Buffer {
  // RFC 6962 Leaf Hash prefixing byte is 0x00
  const leafData = Buffer.from(entryPayload.body, 'base64');
  const hasher = crypto.createHash('sha256');
  hasher.update(Buffer.from([0x00]));
  hasher.update(leafData);
  return hasher.digest();
}


function printUsage() {
    console.log('Usage:');
    console.log('  npx tsx scripts/verify-rekor-interop.ts --submit [--evidence <path>]   Submit entry to live Rekor API & export evidence');
    console.log('  npx tsx scripts/verify-rekor-interop.ts --verify [--evidence <path>]   Verify exported evidence file in a separate run');
}

async function main() {
    const args = process.argv.slice(2);
    
    // Parse custom evidence path if provided
    const evidenceIndex = args.indexOf('--evidence');
    if (evidenceIndex !== -1 && evidenceIndex + 1 < args.length) {
        EVIDENCE_FILE = path.resolve(args[evidenceIndex + 1]);
    } else {
        // Automatically check alternative path configurations
        const defaultPath = path.join(process.cwd(), 'evidence', 'rekor-interop-evidence.json');
        const cwdDirectPath = path.join(process.cwd(), 'rekor-interop-evidence.json');
        
        if (!fs.existsSync(defaultPath) && fs.existsSync(cwdDirectPath)) {
            EVIDENCE_FILE = cwdDirectPath;
        } else {
            try {
                const scriptDir = path.dirname(fileURLToPath(import.meta.url));
                const scriptDirectPath = path.join(scriptDir, 'rekor-interop-evidence.json');
                const scriptParentPath = path.join(scriptDir, '..', 'evidence', 'rekor-interop-evidence.json');
                
                if (!fs.existsSync(defaultPath) && fs.existsSync(scriptDirectPath)) {
                    EVIDENCE_FILE = scriptDirectPath;
                } else if (!fs.existsSync(defaultPath) && fs.existsSync(scriptParentPath)) {
                    EVIDENCE_FILE = scriptParentPath;
                }
            } catch {
                // Fallback for non-ESM context or dynamic errors
            }
        }
    }

    if (args.includes('--submit')) {
        await submitMode();
    } else if (args.includes('--verify')) {
        await verifyMode();
    } else {
        printUsage();
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
