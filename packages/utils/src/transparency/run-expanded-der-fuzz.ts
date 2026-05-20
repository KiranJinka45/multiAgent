import { CryptoRegistry } from './crypto-registry.js';

interface MutationResult {
    name: string;
    payloadHex: string;
    rejected: boolean;
    errorReason: string;
}

class ZtanExpandedDERFuzzer {
    // Valid secp256r1 signature baseline in DER format
    private validSigHex = "304402207fffffffffffffffffffffffffffffff5d737d0a47cee4a0b2afc6779f9cc01f02207fffffffffffffffffffffffffffffff5d737d0a47cee4a0b2afc6779f9cc01f";

    public runCampaign() {
        console.log("===========================================================");
        console.log("    ZTAN Highly Expanded Grammar-Based DER Mutation Fuzzer ");
        console.log("===========================================================");
        console.log(`[INIT] Baseline valid signature: ${this.validSigHex.substring(0, 20)}...`);

        const mutations: { name: string; mutator: (buf: Buffer) => Buffer }[] = [
            {
                name: "Indefinite Length Form Injection",
                mutator: (buf) => {
                    const clone = Buffer.from(buf);
                    clone[1] = 0x80; // Indefinite length byte
                    return clone;
                }
            },
            {
                name: "Recursive Length Nesting (Deep Multi-byte)",
                mutator: (buf) => {
                    // Create multi-byte length representation (0x82 followed by length)
                    const prefix = Buffer.from([0x30, 0x82, 0x00, buf.length - 2]);
                    return Buffer.concat([prefix, buf.subarray(2)]);
                }
            },
            {
                name: "Integer Truncation Attack",
                mutator: (buf) => {
                    // Reduce the actual buffer length by 5 bytes, keeping the internal length fields large
                    return buf.subarray(0, buf.length - 5);
                }
            },
            {
                name: "Duplicate Tag Injection (Multiple 0x02)",
                mutator: (buf) => {
                    // Inject a third 0x02 tag in between R and S
                    const rPart = buf.subarray(0, 38);
                    const duplicateTag = Buffer.from([0x02, 0x04, 0x11, 0x22, 0x33, 0x44]);
                    const sPart = buf.subarray(38);
                    return Buffer.concat([rPart, duplicateTag, sPart]);
                }
            },
            {
                name: "Oversized Allocation Length (Sequence Level)",
                mutator: (buf) => {
                    const clone = Buffer.from(buf);
                    clone[1] = 0xFF; // Oversized total sequence length
                    return clone;
                }
            },
            {
                name: "Oversized Allocation Length (Integer Level)",
                mutator: (buf) => {
                    const clone = Buffer.from(buf);
                    clone[3] = 0x80; // Oversized R integer length (128 bytes)
                    return clone;
                }
            },
            {
                name: "Malformed Nested Sequence tag inside Integer R",
                mutator: (buf) => {
                    const clone = Buffer.from(buf);
                    clone[6] = 0x30; // Inject a sequence tag inside R payload bytes
                    return clone;
                }
            },
            {
                name: "Recursive Parser Depth Pressure",
                mutator: (buf) => {
                    // Wrap the valid sequence inside another sequence tag to force recursion
                    const outerSeq = Buffer.from([0x30, buf.length]);
                    return Buffer.concat([outerSeq, buf]);
                }
            }
        ];

        let passCount = 0;
        let failCount = 0;
        const results: MutationResult[] = [];

        for (const mut of mutations) {
            const rawBuf = Buffer.from(this.validSigHex, 'hex');
            const mutatedBuf = mut.mutator(rawBuf);

            try {
                // Execute pre-flight DER validation
                CryptoRegistry.validateAndParseDEREcdsa(mutatedBuf);
                
                // If it parses, it is an bypass anomaly!
                console.error(`[FAIL] Bypass vulnerability! Mutation: "${mut.name}" was ACCEPTED.`);
                failCount++;
                results.push({
                    name: mut.name,
                    payloadHex: mutatedBuf.toString('hex'),
                    rejected: false,
                    errorReason: "None"
                });
            } catch (err: any) {
                passCount++;
                console.log(`[PASS] Correctly rejected: "${mut.name}". Reason: ${err.message}`);
                results.push({
                    name: mut.name,
                    payloadHex: mutatedBuf.toString('hex'),
                    rejected: true,
                    errorReason: err.message
                });
            }
        }

        console.log("\n===========================================================");
        console.log("    Expanded ASN.1 Mutation Validation Summary            ");
        console.log("===========================================================");
        console.log(`  - Total Mutations Tested: ${mutations.length}`);
        console.log(`  - Successfully Blocked:   ${passCount}`);
        console.log(`  - Bypass Vulnerabilities:  ${failCount}`);

        if (failCount > 0) {
            console.error("\n[RESULT] ❌ Security Audit Failed. Parser-layer bypasses identified.");
            process.exit(1);
        } else {
            console.log("\n[RESULT] ✅ Security Parity Confirmed. Pre-flight firewall successfully blocked the tested ASN.1 mutations under the current simulated validation parameters.");
            process.exit(0);
        }
    }
}

const derFuzzer = new ZtanExpandedDERFuzzer();
derFuzzer.runCampaign();
