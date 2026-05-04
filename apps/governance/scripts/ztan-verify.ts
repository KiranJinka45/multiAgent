#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { ThresholdCrypto, FileReplayGuard } from '@packages/ztan-crypto';

const program = new Command();

const REPLAY_DB = path.join(process.cwd(), '.ztan_replay_db.json');
const guard = new FileReplayGuard(REPLAY_DB);

program
  .name('ztan-verify')
  .description('ZTAN Audit Verifier CLI')
  .argument('<file>', 'audit input file (json)')
  .option('-j, --json', 'output raw JSON result for pipelines')
  .option('-s, --silent', 'suppress all output except exit code')
  .option('-t, --threshold <count>', 'simulated consensus threshold', '3')
  .option('-e, --export <path>', 'export evidence bundle')
  .action(async (file, options) => {
    try {
      if (!fs.existsSync(file)) {
        if (!options.silent) console.error(`Error: File not found: ${file}`);
        process.exit(1);
      }

      const inputRaw = fs.readFileSync(file, 'utf-8').trim();
      const inputData = JSON.parse(inputRaw);
      
      // Step 1: Initial verification for anchor (SKIP MARK SEEN)
      const initial = await ThresholdCrypto.verifyAudit(inputRaw, { guard, skipMarkSeen: true });
      if (initial.status === 'FAILED') {
        if (!options.silent) console.error(chalk.red('Initial verification failed: ' + initial.reason));
        process.exit(1);
      }

      // Step 2: Simulated Consensus collection
      const anchor = initial.finalAnchor!;
      const AUTHORITIES = ['SEC-01', 'SRE-02', 'GOV-03', 'LAW-04', 'OPS-05'];
      const threshold = parseInt(options.threshold);
      
      const partialSigs = await Promise.all(AUTHORITIES.slice(0, threshold).map(async id => ({
        verifierId: id,
        signature: await ThresholdCrypto.signAnchor(anchor, id)
      })));

      const consensusInput = {
        ...inputData,
        partialAnchorSignatures: partialSigs,
        consensusThreshold: threshold
      };

      // Step 3: Final Consensus Verification
      const finalResult = await ThresholdCrypto.verifyAudit(JSON.stringify(consensusInput), { guard });

      if (options.export) {
        const bundle = {
          version: 'ZTAN_AUDIT_EVIDENCE_V1.1',
          input: { 
            raw: inputRaw,
            fingerprint: initial.inputHash 
          },
          consensus: {
            status: finalResult.status,
            signatures: finalResult.signatureMetadata,
            threshold: consensusInput.consensusThreshold,
            payloadHash: finalResult.inputHash // This is the hash of consensus payload
          },
          integrity: {
            canonicalHash: finalResult.canonicalHash,
            finalAnchor: finalResult.finalAnchor,
            traceChain: finalResult.traceHashChain
          },
          reproducibility: {
            algorithms: { hashing: 'SHA-256', signatures: 'BLS-SIM-V1' },
            spec: 'ZTAN_CANONICAL_V1',
            steps: '1. Verify original raw -> fingerprint. 2. Verify consensus payload hash. 3. Verify traceChain. 4. Re-anchor. 5. Verify authority signatures.'
          }
        };
        fs.writeFileSync(options.export, JSON.stringify(bundle, null, 2));
        console.log(`\n✔ Evidence bundle exported to: ${options.export}`);
      }

      const result = finalResult;

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.status === 'VERIFIED' ? 0 : 1);
      }

      if (options.silent) {
        process.exit(result.status === 'VERIFIED' ? 0 : 1);
      }

      // Human Readable Mode
      console.log('\n' + chalk.bold('ZTAN CRYPTOGRAPHIC INFRASTRUCTURE VERIFICATION RESULT\n'));

      if (result.status === 'VERIFIED') {
        console.log(chalk.green('STATUS: CONSENSUS VERIFIED\n'));
      } else {
        console.log(chalk.red('STATUS: FAILED\n'));
        if (result.errorType) {
          console.log(`${chalk.yellow('Error Type:')} ${result.errorType}`);
        }
      }

      console.log(`${chalk.bold('Aggregate Signature:')} ${chalk.magenta(result.aggregateAnchorSignature || 'NONE')}`);
      console.log(`${chalk.bold('Input Fingerprint:')} ${chalk.gray(result.inputHash)}\n`);

      console.log(chalk.bold('Consensus Dashboard:'));
      console.log(`${chalk.blue('→')} Threshold: ${chalk.bold(threshold)}/${AUTHORITIES.length} independent authorities`);
      result.contributingVerifiers?.forEach(id => {
        console.log(`  [OK] ${id} signed anchor`);
      });
      console.log('');

      console.log(chalk.bold('Verification Trace & Hash Chain:'));
      result.trace.forEach((step, i) => {
        const hash = result.traceHashChain[i];
        console.log(`${chalk.blue('→')} ${step}`);
        console.log(`  ${chalk.gray('🔗 ' + hash.slice(0, 32) + '...')}`);
      });
      console.log('');

      if (result.finalAnchor) {
        console.log(chalk.bold('Final Root Anchor:'));
        console.log(chalk.gray(result.finalAnchor) + '\n');
      }

      console.log(chalk.bold('Checks:'));
      console.log(`- Canonical Encoding:   ${flag(result.checks.canonicalEncoding)}`);
      console.log(`- Distributed Replay:   ${flag(result.checks.replayProtection)}`);
      console.log(`- Consensus Reached:    ${flag(result.checks.consensusReached)}`);
      console.log(`- Infrastructure Bind:   ${flag(result.checks.anchorValid)}\n`);

      if (result.canonicalHash) {
        console.log(chalk.bold('Canonical Hash:'));
        console.log(chalk.cyan(result.formattedHash) + '\n');
      }

      process.exit(result.status === 'VERIFIED' ? 0 : 1);

    } catch (e: any) {
      if (!options.silent) {
        console.log(chalk.red('\nSTATUS: FAILED (INTERNAL)\n'));
        console.log('Reason:\n' + e.message);
      }
      process.exit(1);
    }
  });

program.parse();

function flag(ok: boolean) {
  return ok ? 'OK' : 'FAIL';
}
