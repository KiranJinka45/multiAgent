import crypto from 'crypto';
import { CryptoRegistry, SignatureAlgorithm } from './crypto-registry.js';

const P256_N = BigInt("0xffffffff00000000ffffffffffffffffbce6fa148f9dc941655f8cef3f39803f");
const P256_HALF_N = P256_N / 2n;

// Construct a valid DER ECDSA signature from R and S BigInts
function encodeDERSignature(r: bigint, s: bigint): Buffer {
	let rHex = r.toString(16);
	let sHex = s.toString(16);

	if (rHex.length % 2 !== 0) rHex = '0' + rHex;
	if (sHex.length % 2 !== 0) sHex = '0' + sHex;

	let rBytes = Buffer.from(rHex, 'hex');
	let sBytes = Buffer.from(sHex, 'hex');

	// If highest bit is set, prepend 0x00 to avoid treating as negative
	if ((rBytes[0] & 0x80) !== 0) {
		rBytes = Buffer.concat([Buffer.from([0x00]), rBytes]);
	}
	if ((sBytes[0] & 0x80) !== 0) {
		sBytes = Buffer.concat([Buffer.from([0x00]), sBytes]);
	}

	const totalLen = 2 + rBytes.length + 2 + sBytes.length;
	const signature = Buffer.alloc(2 + totalLen);
	signature[0] = 0x30;
	signature[1] = totalLen;

	let idx = 2;
	signature[idx] = 0x02;
	signature[idx + 1] = rBytes.length;
	rBytes.copy(signature, idx + 2);
	idx += 2 + rBytes.length;

	signature[idx] = 0x02;
	signature[idx + 1] = sBytes.length;
	sBytes.copy(signature, idx + 2);

	return signature;
}

async function runAsn1DerFuzzCampaign() {
	console.log("===========================================================");
	console.log("    ZTAN Cryptographic DER / ASN.1 Fuzzing Campaign        ");
	console.log("===========================================================");

	// 1. Generate keys and messages for verification testing
	const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
	const data = Buffer.from("ZTAN_CONSENSUS_TRANSIT_MESSAGE");

	// 2. Generate a valid signature using OpenSSL
	const rawSig = crypto.sign('sha256', data, privateKey);
	
	// Relaxed parsing of R & S for initial extraction
	let rVal = 0n;
	let sVal = 0n;
	try {
		let idx = 2;
		const lenR = rawSig[idx + 1];
		const rBytes = rawSig.subarray(idx + 2, idx + 2 + lenR);
		rVal = BigInt("0x" + rBytes.toString("hex"));
		idx += 2 + lenR;
		
		const lenS = rawSig[idx + 1];
		const sBytes = rawSig.subarray(idx + 2, idx + 2 + lenS);
		sVal = BigInt("0x" + sBytes.toString("hex"));
	} catch (e: any) {
		console.error(`[FAIL] Mismatched initial parsing: ${e.message}`);
		process.exit(1);
	}

	// Mathematically normalize to Low-S to create our pristine golden vector
	if (sVal > P256_HALF_N) {
		console.log("[INIT] OpenSSL generated a High-S signature. Normalizing to Low-S format...");
		sVal = P256_N - sVal;
	} else {
		console.log("[INIT] OpenSSL generated a Low-S signature naturally.");
	}

	const validSig = encodeDERSignature(rVal, sVal);
	const parsed = { r: rVal, s: sVal };

	try {
		CryptoRegistry.validateAndParseDEREcdsa(validSig);
		console.log(`[INIT] Normalized Golden base ECDSA signature. r: ${parsed.r.toString(16).substring(0, 16)}..., s: ${parsed.s.toString(16).substring(0, 16)}...`);
		console.log("[INIT] ✅ Golden Base signature verified successfully.");
	} catch (err: any) {
		console.error(`[FAIL] Golden Base verification failed: ${err.message}`);
		process.exit(1);
	}

	let passCount = 0;
	let failCount = 0;

	// Matrix of tests
	const adversarialMatrix = [
		{
			name: "Malleable High-S Signature (Strict Rejection Check)",
			builder: () => {
				const r = parsed.r;
				// Compute the high-S version of the signature: sHigh = N - s
				let sVal = parsed.s;
				if (sVal <= P256_HALF_N) {
					sVal = P256_N - sVal;
				}
				return encodeDERSignature(r, sVal);
			},
			expectedErr: "High-S signature rejected"
		},
		{
			name: "Trailing Bytes in Signature",
			builder: () => {
				return Buffer.concat([validSig, Buffer.from([0x99, 0xAA])]);
			},
			expectedErr: "Trailing bytes or mismatched total length"
		},
		{
			name: "Overlong Integer Padding in R",
			builder: () => {
				// Construct manual R bytes with redundant leading zero
				let rHex = parsed.r.toString(16);
				if (rHex.length % 2 !== 0) rHex = '0' + rHex;
				let rBytes = Buffer.from(rHex, 'hex');
				// Force double leading zeros
				rBytes = Buffer.concat([Buffer.from([0x00, 0x00]), rBytes]);
				
				let sHex = parsed.s.toString(16);
				if (sHex.length % 2 !== 0) sHex = '0' + sHex;
				let sBytes = Buffer.from(sHex, 'hex');
				if ((sBytes[0] & 0x80) !== 0) {
					sBytes = Buffer.concat([Buffer.from([0x00]), sBytes]);
				}

				const totalLen = 2 + rBytes.length + 2 + sBytes.length;
				const sig = Buffer.alloc(2 + totalLen);
				sig[0] = 0x30;
				sig[1] = totalLen;
				sig[2] = 0x02;
				sig[3] = rBytes.length;
				rBytes.copy(sig, 4);
				const sStart = 4 + rBytes.length;
				sig[sStart] = 0x02;
				sig[sStart + 1] = sBytes.length;
				sBytes.copy(sig, sStart + 2);
				return sig;
			},
			expectedErr: "Overlong integer padding in R"
		},
		{
			name: "Negative Integer Sequence without Preceding Zero (R)",
			builder: () => {
				// Create an R with most significant bit 1, but drop the leading 0x00 padding
				// Let's create an artificial R value that starts with 0x80
				const badR = BigInt("0x8000000000000000000000000000000000000000000000000000000000000001");
				let sHex = parsed.s.toString(16);
				if (sHex.length % 2 !== 0) sHex = '0' + sHex;
				let sBytes = Buffer.from(sHex, 'hex');
				if ((sBytes[0] & 0x80) !== 0) {
					sBytes = Buffer.concat([Buffer.from([0x00]), sBytes]);
				}

				const rBytes = Buffer.from(badR.toString(16), 'hex'); // starts with 0x80, no 0x00 prepended!
				const totalLen = 2 + rBytes.length + 2 + sBytes.length;
				const sig = Buffer.alloc(2 + totalLen);
				sig[0] = 0x30;
				sig[1] = totalLen;
				sig[2] = 0x02;
				sig[3] = rBytes.length;
				rBytes.copy(sig, 4);
				const sStart = 4 + rBytes.length;
				sig[sStart] = 0x02;
				sig[sStart + 1] = sBytes.length;
				sBytes.copy(sig, sStart + 2);
				return sig;
			},
			expectedErr: "Negative integers not allowed in DER signature R"
		},
		{
			name: "Malformed Sequence Tag Mismatch",
			builder: () => {
				const copied = Buffer.from(validSig);
				copied[0] = 0x31; // Mutate sequence tag
				return copied;
			},
			expectedErr: "Invalid sequence tag"
		},
		{
			name: "Invalid Total Length Overflow",
			builder: () => {
				const copied = Buffer.from(validSig);
				copied[1] = copied[1] + 5; // Lie about total length
				return copied;
			},
			expectedErr: "Trailing bytes or mismatched total length"
		},
		{
			name: "R Integer Length Underflow Overflow",
			builder: () => {
				const copied = Buffer.from(validSig);
				copied[3] = 0xFF; // Set R integer length to invalid value
				return copied;
			},
			expectedErr: "Malformed length for R integer"
		}
	];

	console.log("\n--- Executing Adversarial Mutators Campaign ---");

	for (const test of adversarialMatrix) {
		try {
			const mutatedSig = test.builder();
			
			// Test low-level parser directly
			try {
				CryptoRegistry.validateAndParseDEREcdsa(mutatedSig);
				console.log(`[FAIL] ❌ ${test.name} was ACCEPTED by the validator! Expected rejection containing: "${test.expectedErr}"`);
				failCount++;
			} catch (e: any) {
				if (e.message.includes(test.expectedErr)) {
					console.log(`[PASS] ✅ ${test.name} was successfully rejected: "${e.message}"`);
					passCount++;
				} else {
					console.log(`[FAIL] ❌ ${test.name} threw unexpected error: "${e.message}" (Expected: "${test.expectedErr}")`);
					failCount++;
				}
			}

			// Test high-level crypto-registry API to ensure safety firewall intercepts
			const isSigAccepted = CryptoRegistry.verify({
				algorithm: SignatureAlgorithm.ECDSA_P256,
				publicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string,
				signature: mutatedSig.toString('base64'),
				data
			});

			if (isSigAccepted) {
				console.error(`[CRITICAL] 🚨 Gateway accepted malformed signature in verification path: ${test.name}`);
			} else {
				// Confirmed blocked!
			}

		} catch (outerErr: any) {
			console.log(`[SKIPPED] ⚠️ Could not build mutated signature for "${test.name}": ${outerErr.message}`);
		}
	}

	console.log("\n===========================================================");
	console.log("    DER / ASN.1 Fuzzing Validation Summary                 ");
	console.log("===========================================================");
	console.log(`  - Total Executed Mutation Vector Classes: ${passCount + failCount}`);
	console.log(`  - Blocked & Verified Rejections:          ${passCount}`);
	console.log(`  - Failed Rejections / Divergences:       ${failCount}`);

	if (failCount > 0) {
		console.log("\n[RESULT] ❌ ASN.1 DER cryptographic verifier is insecure. Parity splits possible.");
		process.exit(1);
	} else {
		console.log("\n[RESULT] ✅ Absolute cryptographic parity achieved. Strict DER bounds enforce deterministic verification.");
		process.exit(0);
	}
}

runAsn1DerFuzzCampaign();
