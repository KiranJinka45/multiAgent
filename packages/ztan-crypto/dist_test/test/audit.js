"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function runAudit() {
    console.log('--- ZTAN NODE.JS AUDIT SUITE (v1.4) ---');
    const vectorsPath = path.join(__dirname, 'vectors.json');
    if (!fs.existsSync(vectorsPath)) {
        console.error('✖ FATAL: vectors.json not found');
        process.exit(1);
    }
    const { vectors } = JSON.parse(fs.readFileSync(vectorsPath, 'utf-8'));
    let failed = 0;
    for (const v of vectors) {
        console.log(`\n[TEST] ${v.name}`);
        try {
            const { canonicalHashHex } = index_1.ThresholdCrypto.buildCanonicalPayload(v.input.auditId, v.input.timestamp, v.input.payloadHash, v.input.threshold, v.input.nodeIds);
            if (v.type === 'FAILURE') {
                console.error(`  ✖ FAIL: Expected failure but got hash ${canonicalHashHex}`);
                failed++;
            }
            else {
                console.log(`  ✔ SUCCESS: Hash = ${canonicalHashHex}`);
                if (v.expectedHash && canonicalHashHex !== v.expectedHash) {
                    console.error(`  ✖ PARITY ERROR: Expected ${v.expectedHash}`);
                    failed++;
                }
            }
        }
        catch (e) {
            if (v.type === 'FAILURE') {
                const matches = e.message.includes(v.error) || v.error === "";
                if (matches) {
                    console.log(`  ✔ CORRECTLY REJECTED: ${e.message}`);
                }
                else {
                    console.error(`  ✖ ERROR MISMATCH: Expected "${v.error}", got "${e.message}"`);
                    failed++;
                }
            }
            else {
                console.error(`  ✖ UNEXPECTED FAILURE: ${e.message}`);
                failed++;
            }
        }
    }
    // --- STRESS TEST (PHASE 4) ---
    console.log('\n[TEST] Large Input Stress (1024 Nodes, 1MB AuditId)');
    try {
        const largeAuditId = 'A'.repeat(1024 * 1024);
        const largeNodeIds = Array.from({ length: 1024 }, (_, i) => `Node-${i.toString().padStart(4, '0')}`);
        const start = Date.now();
        const { canonicalHashHex } = index_1.ThresholdCrypto.buildCanonicalPayload(largeAuditId, Date.now(), "00".repeat(32), 1, largeNodeIds);
        console.log(`  ✔ SUCCESS: Processed in ${Date.now() - start}ms (Hash: ${canonicalHashHex.slice(0, 16)}...)`);
    }
    catch (e) {
        console.error(`  ✖ STRESS TEST FAILED: ${e.message}`);
        failed++;
    }
    const total = vectors.length + 1;
    const passed = total - failed;
    console.log(`\n--- AUDIT FINAL: ${passed}/${total} PASSED ---`);
    if (failed > 0) {
        console.error(`✖ AUDIT FAILED WITH ${failed} ERRORS`);
        process.exit(1);
    }
    console.log('✔ AUDIT PASSED CLEANLY');
}
runAudit();
