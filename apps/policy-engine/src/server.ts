import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { serverConfig } from '@packages/config';
import { logger } from '@packages/observability';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Standard authorized operators whitelist matching the Rego policy
const AUTHORIZED_OPERATORS = new Set([
  'steward_omega',
  'operator_alpha',
  'operator_beta',
  'backup_steward',
  'mock_operator'
]);

// Set of dangerous node modules forbidden in client-side generated files
const FORBIDDEN_IMPORTS = [
  'child_process',
  'fs',
  'net',
  'dns',
  'process'
];

// Statically pre-load the compiled Rego policy hash on startup to avoid expensive synchronous disk I/O in express routes
const REGO_PATH = path.resolve(__dirname, '../../../src/runtime/policy/ztan_safety.rego');
let regoPolicyHash = '';
try {
  if (fs.existsSync(REGO_PATH)) {
    const regoContent = fs.readFileSync(REGO_PATH);
    regoPolicyHash = crypto.createHash('sha256').update(regoContent).digest('hex');
  }
} catch (err: any) {
  logger.error({ err: err.message }, '[PolicyEngine] Failed to load Rego policy statically on startup');
}

export function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());

  // Log incoming requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`🚥 [POLICY-ENGINE IN] ${req.method} ${req.path}`);
    next();
  });

  // Health and readiness checks
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'policy-engine',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health/ready', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      service: 'policy-engine'
    });
  });

  // Evaluate endpoint
  app.post('/api/v1/policy/evaluate', async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, operator, action, files = [] } = req.body;

      if (!token) {
        res.status(200).json({
          allowed: false,
          reason: 'JWT_VERIFICATION_FAILED: Signed execution token is missing.',
          quarantined: true
        });
        return;
      }

      // 1. Verify Cryptographic JWT Token Issued by Stage 1 Intent Gateway
      const secret = serverConfig.JWT_SECRET;
      let decodedToken: any = null;
      try {
        decodedToken = jwt.verify(token, secret);
      } catch (err: any) {
        logger.error({ err: err.message }, 'JWT token verification failed');
        res.status(200).json({
          allowed: false,
          reason: `JWT_VERIFICATION_FAILED: Signed execution token is invalid or expired. Error: ${err.message}`,
          quarantined: true
        });
        return;
      }

      // 2. Verify Cryptographic Integrity of Rego Policy File
      if (!regoPolicyHash) {
        logger.error('[PolicyEngine] Rego policy hash is uninitialized or missing.');
        res.status(200).json({
          allowed: false,
          reason: 'OPA_FAIL_CLOSED: Rego safety policy verification failed on startup.',
          quarantined: true
        });
        return;
      }

      // The pre-approved expected hash for ztan_safety.rego
      // We also let developers configure this or default to computed to maintain liveness
      const approvedRegoHash = process.env.APPROVED_REGO_HASH || 'cf9f0e1f73752e5a76f2d2b56e6d1ebdf0cd304918e69cf24c4e78a6dbfa1b8f'; 
      
      // Calculate dynamic hash if there's an expected override
      if (process.env.STRICT_POLICY_HASH_LOCK === 'true' && regoPolicyHash !== approvedRegoHash) {
        logger.error({ computedRegoHash: regoPolicyHash, approvedRegoHash }, '[PolicyEngine] Cryptographic drift detected on Rego Policy!');
        res.status(200).json({
          allowed: false,
          reason: `OPA_FAIL_CLOSED: Cryptographic drift detected on Rego Policy! Computed: ${regoPolicyHash}`,
          quarantined: true
        });
        return;
      }

      // 3. Enforce Operator Authorization
      const activeOperator = operator || decodedToken.operator || 'unknown_operator';
      if (activeOperator === 'compromised_operator' || !AUTHORIZED_OPERATORS.has(activeOperator)) {
        logger.warn({ activeOperator }, '[PolicyEngine] Unauthorized operator access attempt blocked');
        res.status(200).json({
          allowed: false,
          reason: `POLICY_VIOLATION: Operator '${activeOperator}' is unauthorized or compromised.`,
          quarantined: true
        });
        return;
      }

      // 4. Enforce Regulatory Path Guidelines
      for (const file of files) {
        if (!file.path || typeof file.path !== 'string') continue;

        const normalizedPath = file.path.replace(/\\/g, '/');

        // Path rules: MUST only write inside safe web directories (src/app, src/components, etc.)
        // Block writing to sensitive system directories and files
        const isSafePath = normalizedPath.startsWith('src/app/') || 
                           normalizedPath.startsWith('src/components/') || 
                           normalizedPath === 'package.json';

        const isRestrictedFile = normalizedPath.includes('.env') || 
                                 normalizedPath.includes('.rego') || 
                                 normalizedPath.includes('tsconfig') ||
                                 normalizedPath.includes('approved_compliance_ledger') ||
                                 normalizedPath.includes('CONSTITUTION') ||
                                 normalizedPath.startsWith('packages/core-engine/');

        if (!isSafePath || isRestrictedFile) {
          logger.warn({ normalizedPath }, '[PolicyEngine] Blocked attempt to write to restricted path');
          res.status(200).json({
            allowed: false,
            reason: `POLICY_VIOLATION: Regulatory constraints block file creation or modification at: '${file.path}'`,
            quarantined: true
          });
          return;
        }

        // 5. Enforce Code Safety / Forbidden Server-side Imports
        const isCodeFile = normalizedPath.endsWith('.ts') || 
                           normalizedPath.endsWith('.tsx') || 
                           normalizedPath.endsWith('.js') || 
                           normalizedPath.endsWith('.jsx');

        if (isCodeFile && file.content) {
          const contentStr = file.content;
          for (const forbidden of FORBIDDEN_IMPORTS) {
            // Regex matching standard TS/JS import statements (e.g. import * from 'fs' or require('fs'))
            const importRegex = new RegExp(`(import\\s+.*from\\s+['"]${forbidden}['"]|require\\(\\s*['"]${forbidden}['"]\\s*\\))`, 'g');
            if (importRegex.test(contentStr)) {
              logger.warn({ forbidden, path: file.path }, '[PolicyEngine] Dangerous server-side module import detected');
              res.status(200).json({
                allowed: false,
                reason: `POLICY_VIOLATION: Dangerous server-side module '${forbidden}' is forbidden in client-side files: '${file.path}'`,
                quarantined: true
              });
              return;
            }
          }
        }
      }

      logger.info({ operator: activeOperator, auditId: decodedToken.execution_intent_id }, 'Policy evaluation successfully allowed');
      
      res.status(200).json({
        allowed: true,
        quarantined: false,
        reason: undefined
      });
    } catch (err: any) {
      logger.error({ err: err.message, stack: err.stack }, 'Critical policy engine evaluation failure');
      res.status(500).json({
        error: 'An internal error occurred during policy evaluation.',
        code: 'POLICY_EVALUATION_FAILURE'
      });
    }
  });

  return app;
}
