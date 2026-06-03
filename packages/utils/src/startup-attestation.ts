import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { logger } from '@packages/observability';

const INTEGRITY_FILE = path.join(process.cwd(), '.ztan-config-integrity');
const ENV_FILE = path.join(process.cwd(), '.env');

const STATIC_WHITELIST = new Set([
  // Core Node/OS Variables
  'PATH', 'SYSTEMROOT', 'TEMP', 'TMP', 'USERNAME', 'USERPROFILE', 'HOME', 'PWD', 'LANG', 'OS', 'COMSPEC',
  'PATHEXT', 'PSMODULEPATH', 'NODE_ENV', 'PORT', 'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET_KEY', 'JWT_SECRET',
  'INTERNAL_SERVICE_TOKEN', 'LLM_PROVIDER', 'DEFAULT_EMBEDDING_MODEL', 'NO_CLUSTER', 'CLUSTER_WORKERS',
  'SERVICE_NAME', 'IS_GOVERNANCE_WRITER', 'ZTAN_PARTITIONS', 'ZTAN_TEST_WRITER', 'MOCK_DB',
  'GATEWAY_PORT', 'CORE_API_PORT', 'CORE_ENGINE_PORT', 'FRONTEND_PORT', 'AUTH_SERVICE_PORT', 'WORKER_PORT',
  'CORE_ENGINE_URL', 'CERTIFICATION_MODE', 'LOG_LEVEL',
  // API provider keys
  'GROQ_API_KEY', 'STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'GEMINI_API_KEY',
  'OPENAI_API_KEY', 'CEREBRAS_API_KEY', 'MISTRAL_API_KEY', 'SAMBANOVA_API_KEY', 'AICC_API_KEY',
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'PARTNER_ALPHA_KEY',
  // Test controls
  'ZTAN_INJECT_TX_STALL', 'ZTAN_INJECT_TX_CRASH', 'ZTAN_KILL_POINT', 'ZTAN_TEST_WRITER', 'ZTAN_PARTITIONS',
  'PNPM_HOME', 'PROCESSOR_ARCHITECTURE', 'NUMBER_OF_PROCESSORS', 'SYSTEMDRIVE', 'WINDIR',
  'LOCALAPPDATA', 'APPDATA', 'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)', 'PROGRAMDATA',
  'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PUBLIC', 'ALLUSERSPROFILE', 'COMPUTERNAME', 'HOMEDRIVE', 'HOMEPATH',
  'LOGONSERVER', 'USERDOMAIN', 'USERDOMAIN_ROAMINGPROFILE', 'USERPROFILE', 'DRIVE_LETTER',
  'COLOR', 'DRIVERDATA', 'EDITOR', 'INIT_CWD', 'JAVA_HOME', 'NODE', 'NPX_CLI_JS', 'PROMPT', 'SESSIONNAME'
]);

export const StartupAttestationService = {
  /**
   * Seals/securitizes the startup config (.env) by writing its SHA-256 fingerprint.
   * If the file is missing, we create it.
   */
  sealConfiguration(): void {
    try {
      if (!fs.existsSync(ENV_FILE)) {
        return;
      }
      const rawEnv = fs.readFileSync(ENV_FILE, 'utf8');
      const hash = crypto.createHash('sha256').update(rawEnv).digest('hex');
      fs.writeFileSync(INTEGRITY_FILE, hash, 'utf8');
      logger.info({ hash }, '[StartupAttestation] Sealed active .env configuration successfully.');
    } catch (e: any) {
      logger.error(`[StartupAttestation] Failed to seal config: ${e.message}`);
    }
  },

  /**
   * Verifies configuration integrity by comparing `.env` SHA-256 with the sealed fingerprint.
   */
  verifyConfigurationIntegrity(): boolean {
    if (!fs.existsSync(ENV_FILE)) {
      // If no .env is used, integrity check is trivially satisfied
      return true;
    }
    if (!fs.existsSync(INTEGRITY_FILE)) {
      // Seal on first check to simulate boot-attestation registration
      this.sealConfiguration();
      return true;
    }
    try {
      const rawEnv = fs.readFileSync(ENV_FILE, 'utf8');
      const expectedHash = fs.readFileSync(INTEGRITY_FILE, 'utf8').trim();
      const actualHash = crypto.createHash('sha256').update(rawEnv).digest('hex');
      if (actualHash !== expectedHash) {
        logger.error(`[StartupAttestation] CONFIGURATION BREACH: Active .env hash (${actualHash}) does not match sealed integrity signature (${expectedHash}).`);
        return false;
      }
      return true;
    } catch (e: any) {
      logger.error(`[StartupAttestation] Integrity check error: ${e.message}`);
      return false;
    }
  },

  /**
   * Audits process.env to reject unchecksummed, unledgered environment variable injections.
   */
  verifyEnvironmentVariables(): boolean {
    const keys = Object.keys(process.env);
    const violations: string[] = [];

    for (const key of keys) {
      const upperKey = key.toUpperCase();
      // Allow list bypass for dynamically injected node/pnpm temporary variables and IDE/system variables
      if (
        key.startsWith('npm_') || 
        key.startsWith('pnpm_') || 
        key.startsWith('PNPM_') || 
        key.startsWith('vite_') || 
        key.startsWith('NEXT_') ||
        key.startsWith('ANTIGRAVITY_') ||
        key.startsWith('VSCODE_') ||
        key.startsWith('CHROME_') ||
        key.startsWith('EFC_') ||
        key.startsWith('FPS_') ||
        key.startsWith('NODE_') ||
        key.startsWith('NPM_') ||
        key.startsWith('OneDrive') ||
        key.startsWith('PROCESSOR_') ||
        key.startsWith('Program') ||
        key.startsWith('Common') ||
        key.startsWith('COMMON') ||
        key.startsWith('WT_') ||
        key.startsWith('WSL') ||
        key.startsWith('POSTGRES_') ||
        key.startsWith('AUTH_') ||
        key.startsWith('CORE_') ||
        key.startsWith('OTEL_')
      ) {
        continue;
      }
      if (key.startsWith('ZTAN_')) {
        continue;
      }
      if (!STATIC_WHITELIST.has(upperKey) && !STATIC_WHITELIST.has(key)) {
        violations.push(key);
      }
    }

    if (violations.length > 0) {
      logger.error({ violations }, `[StartupAttestation] SECURITY BREACH: Unledgered shadow environment variables detected: ${violations.join(', ')}`);
      return false;
    }

    return true;
  }
};
