import dotenv from 'dotenv';
dotenv.config();

import { OperatorValidator } from '../packages/runtime-core/src/archaeology/operator-validator';
import { CommandDepthAuditor } from '../packages/runtime-core/src/archaeology/command-depth-auditor';

async function runSprintE4Verification() {
    console.log('================================================================================');
    console.log('🔭  ZTAN PHASE 12 SPRINT E1.4 - HUMAN OPERATOR VALIDATION RUNNER');
    console.log('================================================================================\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 1: NIST P-256 Override Key Validation
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 1] Auditing NIST P-256 Base64 override signature formats...');
    
    // P-256 signature in DER format (71 bytes) - Valid Base64
    const validDerSignature = 'sig:MEQCIE3D4Jk69hG2B5pZfOa0+aX3n13dEef6n9/8A8z+ZfOiAiB5X11t9eFefGef9uX3n13dEef6n9/8A8z+ZfOiAg==';
    // Malformed signature (too short)
    const malformedSignature = 'sig:SRE-BYPASS-INVALID';
    // 64-byte raw signature - Valid Base64
    const validRawSignature = `sig:${Buffer.alloc(64).toString('base64')}`;

    const check1 = OperatorValidator.verifyP256SignatureLayout(validDerSignature);
    const check2 = OperatorValidator.verifyP256SignatureLayout(malformedSignature);
    const check3 = OperatorValidator.verifyP256SignatureLayout(validRawSignature);

    console.log(`     - Valid DER format approved:  ${check1}`);
    console.log(`     - Valid raw format approved:  ${check3}`);
    console.log(`     - Malformed format rejected:  ${!check2}`);

    if (check1 && !check2 && check3) {
        console.log('  ✅ NIST P-256 cryptographic signature layout rules verified.');
    } else {
        throw new Error('NIST P-256 signature verification failed!');
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 2: Command-Depth Complexity Limits
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 2] Auditing operator recovery command-depth limits...');
    
    // Compliant commands (depth <= 2)
    const cmd1 = 'npx tsx scripts/reconstruct-incident.ts incident.json'; // Depth 1
    const cmd2 = 'npx tsx scripts/reconstruct-incident.ts incident.json; exit 0'; // Depth 2
    // Non-compliant commands (depth > 2)
    const cmd3 = 'cat log.txt | grep error | awk \'{print $2}\' | xargs kill'; // Depth 4
    const cmd4 = 'npm run build && npm test && git commit -m "verify"'; // Depth 3

    const depth1 = CommandDepthAuditor.calculateDepth(cmd1);
    const depth2 = CommandDepthAuditor.calculateDepth(cmd2);
    const depth3 = CommandDepthAuditor.calculateDepth(cmd3);
    const depth4 = CommandDepthAuditor.calculateDepth(cmd4);

    const comp1 = CommandDepthAuditor.isCompliant(cmd1);
    const comp2 = CommandDepthAuditor.isCompliant(cmd2);
    const comp3 = CommandDepthAuditor.isCompliant(cmd3);
    const comp4 = CommandDepthAuditor.isCompliant(cmd4);

    console.log(`     - Depth [${depth1}] for: "${cmd1}" (Compliant: ${comp1})`);
    console.log(`     - Depth [${depth2}] for: "${cmd2}" (Compliant: ${comp2})`);
    console.log(`     - Depth [${depth3}] for: "${cmd3}" (Compliant: ${comp3})`);
    console.log(`     - Depth [${depth4}] for: "${cmd4}" (Compliant: ${comp4})`);

    if (comp1 && comp2 && !comp3 && !comp4) {
        console.log('  ✅ Command-depth complexity restriction rules verified.');
    } else {
        throw new Error('Command-depth compliance check failed!');
    }

    console.log('\n================================================================================');
    console.log('🎉 SPRINT E1.4 OPERATOR OVERRIDES AND COMMAND LIMITS VERIFIED SUCCESSFULLY');
    console.log('================================================================================');
    process.exit(0);
}

runSprintE4Verification().catch(err => {
    console.error('Fatal Verification Error:', err);
    process.exit(1);
});
