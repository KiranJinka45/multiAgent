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
const child_process_1 = require("child_process");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const index_1 = require("../src/index");
describe('ZTAN Cross-Runtime Parity Suite', () => {
    const pythonScript = (0, path_1.resolve)(__dirname, '../../../audit/cross_runtime_audit.py');
    const vectorsPath = (0, path_1.resolve)(__dirname, './vectors.json');
    it('should achieve bit-level parity between Node.js and Python auditor', () => {
        // 1. Ensure Python script exists
        expect(fs.existsSync(pythonScript)).toBe(true);
        // 2. Invoke Python Auditor
        try {
            console.log('Running Python Auditor Suite...');
            const output = (0, child_process_1.execSync)(`python "${pythonScript}"`, { encoding: 'utf-8' });
            console.log(output);
            // 3. Assert success in output
            expect(output).toContain('OK AUDIT PASSED CLEANLY');
        }
        catch (error) {
            console.error('Python Auditor Failed:', error.stdout);
            throw new Error(`Cross-runtime parity check failed: ${error.message}`);
        }
    });
    it('should verify that Node.js ztan-crypto matches vectors.json locally', async () => {
        const data = JSON.parse(fs.readFileSync(vectorsPath, 'utf-8'));
        for (const v of data.vectors) {
            if (v.type === 'SUCCESS') {
                const { canonicalHashHex } = index_1.ThresholdBls.buildCanonicalPayload(v.input.auditId, v.input.timestamp, v.input.payloadHash, v.input.threshold, v.input.nodeIds);
                expect(canonicalHashHex).toBe(v.expectedHash);
            }
        }
    });
    it('should prove bi-directional signature parity (Python aggregates, Node verifies)', async () => {
        const messageHash = 'e8bebb06cb303e0d09131a289ec1048a360817cd82d44a92c2c06df51a2f9f69';
        const { shares, masterPublicKey } = await index_1.ThresholdBls.dkg(2, 3, ['A', 'B', 'C']);
        // 1. Node generates partials
        const sigA = await index_1.ThresholdBls.signShare(messageHash, shares[0].secretShare);
        const sigB = await index_1.ThresholdBls.signShare(messageHash, shares[1].secretShare);
        // 2. Python aggregates these Node-generated partials
        const pythonAgg = (0, child_process_1.execSync)(`python "${pythonScript}" --aggregate ${sigA} ${sigB}`, { encoding: 'utf-8' }).trim();
        console.log('Python Aggregated Signature:', pythonAgg);
        // 3. Node verifies Python's aggregate signature
        const isValid = await index_1.ThresholdBls.verify(pythonAgg, messageHash, [masterPublicKey]);
        expect(isValid).toBe(true);
        console.log('Node successfully verified Python aggregate signature.');
    });
});
