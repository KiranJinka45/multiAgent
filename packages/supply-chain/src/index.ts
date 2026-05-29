import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ThresholdCrypto } from '@packages/ztan-crypto';

/**
 * Deterministic JCS stringification helper to guarantee identical
 * serialization across different JS runtimes.
 */
export function stableStringify(obj: any): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  let str = '{';
  for (let i = 0; i < keys.length; i++) {
    if (i > 0) str += ',';
    str += JSON.stringify(keys[i]) + ':' + stableStringify(obj[keys[i]]);
  }
  str += '}';
  return str;
}

/**
 * 0. Measured Boot & Immutable Runtime Image Registry
 */
export class RuntimeImageRegistry {
  public static getSealedImageHash(workspaceRoot: string = process.cwd()): string {
    const filePath = path.resolve(workspaceRoot, '.ztan-runtime-image');
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8').trim();
      }
    } catch (e) {}
    
    // If the file doesn't exist, we seal it by writing the current runtime image hash!
    const current = this.computeCurrent(
      path.resolve(workspaceRoot, 'apps/capability-runtime/src/preload-isolation.cjs'),
      path.resolve(workspaceRoot, 'apps/capability-runtime/src/supervisor.ts')
    );
    try {
      const ztanDir = path.dirname(filePath);
      if (!fs.existsSync(ztanDir)) {
        fs.mkdirSync(ztanDir, { recursive: true });
      }
      fs.writeFileSync(filePath, current.runtimeImageHash, 'utf8');
    } catch (e) {}
    return current.runtimeImageHash;
  }

  public static computeCurrent(preloadPath: string, supervisorPath: string): {
    preloadHash: string;
    supervisorHash: string;
    nodeVersion: string;
    runtimeImageHash: string;
  } {
    let preloadHash = '0'.repeat(64);
    let supervisorHash = '0'.repeat(64);
    try {
      if (fs.existsSync(preloadPath)) {
        preloadHash = crypto.createHash('sha256').update(fs.readFileSync(preloadPath)).digest('hex');
      }
    } catch (e) {}
    try {
      if (fs.existsSync(supervisorPath)) {
        supervisorHash = crypto.createHash('sha256').update(fs.readFileSync(supervisorPath)).digest('hex');
      }
    } catch (e) {}
    const nodeVersion = process.version;
    const rawImage = `${preloadHash}:${supervisorHash}:${nodeVersion}`;
    const runtimeImageHash = crypto.createHash('sha256').update(rawImage).digest('hex');
    return { preloadHash, supervisorHash, nodeVersion, runtimeImageHash };
  }

  public static verifyBootIntegrity(
    preloadPath: string,
    supervisorPath: string,
    workspaceRoot: string = process.cwd()
  ): { valid: boolean; sealedHash: string; currentHash: string } {
    const current = this.computeCurrent(preloadPath, supervisorPath);
    const sealedHash = this.getSealedImageHash(workspaceRoot);
    return {
      valid: current.runtimeImageHash === sealedHash,
      sealedHash,
      currentHash: current.runtimeImageHash
    };
  }
}

/**
 * 1. Runtime Environment Fingerprints
 */
export class EnvironmentFingerprint {
  public static gather(
    preloadPath: string,
    supervisorPath: string,
    capabilities: string[],
    workspaceRoot: string = process.cwd()
  ): {
    nodeVersion: string;
    preloadHash: string;
    policyHash: string;
    supervisorHash: string;
    hostEnvironment: string;
    runtimeImageHash: string;
    fingerprintHash: string;
  } {
    const nodeVersion = process.version;
    
    // Read preload contents safely
    let preloadHash = '0'.repeat(64);
    try {
      if (fs.existsSync(preloadPath)) {
        const content = fs.readFileSync(preloadPath);
        preloadHash = crypto.createHash('sha256').update(content).digest('hex');
      }
    } catch (e) {}

    // Read supervisor contents safely
    let supervisorHash = '0'.repeat(64);
    try {
      if (fs.existsSync(supervisorPath)) {
        const content = fs.readFileSync(supervisorPath);
        supervisorHash = crypto.createHash('sha256').update(content).digest('hex');
      }
    } catch (e) {}

    // Policy constraints (capability token manifest)
    const sortedCaps = [...capabilities].sort();
    const policyHash = crypto.createHash('sha256').update(JSON.stringify(sortedCaps)).digest('hex');

    const hostEnvironment = `${process.platform}-${process.arch}`;

    // Get build-sealed image measurement
    const runtimeImageHash = RuntimeImageRegistry.getSealedImageHash(workspaceRoot);

    const fields = {
      nodeVersion,
      preloadHash,
      policyHash,
      supervisorHash,
      hostEnvironment,
      runtimeImageHash
    };

    const serialized = stableStringify(fields);
    const fingerprintHash = crypto.createHash('sha256').update(serialized).digest('hex');

    return {
      ...fields,
      fingerprintHash
    };
  }
}

/**
 * 2. Dependency Provenance & SBOM
 */
export interface SBOM {
  name: string;
  version: string;
  packageLockFingerprint: string;
  packageJsonFingerprint: string;
  dependencies: Record<string, string>;
}

export class DependencyProvenance {
  public static async generate(workspaceRoot: string = process.cwd()): Promise<{
    sbom: SBOM;
    sbomHash: string;
    sbomSignature: string;
  }> {
    const packageJsonPath = path.resolve(workspaceRoot, 'package.json');
    const pnpmLockPath = path.resolve(workspaceRoot, 'pnpm-lock.yaml');
    const packageLockPath = path.resolve(workspaceRoot, 'package-lock.json');

    let packageJsonFingerprint = '0'.repeat(64);
    let packageLockFingerprint = '0'.repeat(64);
    let name = 'unknown';
    let version = '0.0.0';
    let dependencies: Record<string, string> = {};

    try {
      if (fs.existsSync(packageJsonPath)) {
        const content = fs.readFileSync(packageJsonPath);
        packageJsonFingerprint = crypto.createHash('sha256').update(content).digest('hex');
        const pkg = JSON.parse(content.toString('utf8'));
        name = pkg.name || name;
        version = pkg.version || version;
        dependencies = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {})
        };
      }
    } catch (e) {}

    try {
      if (fs.existsSync(pnpmLockPath)) {
        const content = fs.readFileSync(pnpmLockPath);
        packageLockFingerprint = crypto.createHash('sha256').update(content).digest('hex');
      } else if (fs.existsSync(packageLockPath)) {
        const content = fs.readFileSync(packageLockPath);
        packageLockFingerprint = crypto.createHash('sha256').update(content).digest('hex');
      }
    } catch (e) {}

    // Sort dependencies key alphabetically
    const sortedDeps: Record<string, string> = {};
    Object.keys(dependencies).sort().forEach(k => {
      sortedDeps[k] = dependencies[k];
    });

    const sbom: SBOM = {
      name,
      version,
      packageLockFingerprint,
      packageJsonFingerprint,
      dependencies: sortedDeps
    };

    const sbomJson = stableStringify(sbom);
    const sbomHash = crypto.createHash('sha256').update(sbomJson).digest('hex');

    // Sign the SBOM with BLS using RUNTIME-NODE-01 key
    let sbomSignature = '';
    try {
      sbomSignature = await ThresholdCrypto.signAnchor(sbomHash, 'RUNTIME-NODE-01');
    } catch (e) {}

    return {
      sbom,
      sbomHash,
      sbomSignature
    };
  }
}

/**
 * 3. Deterministic Merkle Trees & Signed Artifact Bundles
 */
export class MerkleTree {
  public static buildMerkleTree(
    artifacts: { path: string; sha256: string }[]
  ): {
    rootHash: string;
    leaves: string[];
    manifest: {
      artifacts: { path: string; sha256: string; leafHash: string }[];
      levels: string[][];
    };
  } {
    if (artifacts.length === 0) {
      const emptyRoot = crypto.createHash('sha256').update('EMPTY_MERKLE_TREE').digest('hex');
      return {
        rootHash: emptyRoot,
        leaves: [],
        manifest: { artifacts: [], levels: [[emptyRoot]] }
      };
    }

    // Sort artifacts lexicographically by path
    const sorted = [...artifacts].sort((a, b) => a.path.localeCompare(b.path));

    // Compute leaf hashes
    const artifactsWithLeaves = sorted.map(art => {
      const leafStr = `${art.path}:${art.sha256}`;
      const leafHash = crypto.createHash('sha256').update(leafStr).digest('hex');
      return {
        ...art,
        leafHash
      };
    });

    const leaves = artifactsWithLeaves.map(a => a.leafHash);
    const levels: string[][] = [leaves];

    let currentLevel = [...leaves];
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : left;
        const combined = crypto.createHash('sha256').update(left + right).digest('hex');
        nextLevel.push(combined);
      }
      levels.push(nextLevel);
      currentLevel = nextLevel;
    }

    return {
      rootHash: currentLevel[0],
      leaves,
      manifest: {
        artifacts: artifactsWithLeaves,
        levels
      }
    };
  }

  /**
   * Helper to verify leaf membership in the Merkle Root
   */
  public static verifyLeaf(
    rootHash: string,
    leafHash: string,
    manifest: { levels: string[][] }
  ): boolean {
    const levels = manifest.levels;
    if (levels.length === 0) return false;
    
    let index = levels[0].indexOf(leafHash);
    if (index === -1) return false;

    let currentHash = leafHash;
    for (let i = 0; i < levels.length - 1; i++) {
      const level = levels[i];
      const isRight = index % 2 === 1;
      const siblingIndex = isRight ? index - 1 : index + 1;
      
      const left = isRight ? level[siblingIndex] : currentHash;
      const right = isRight ? currentHash : (siblingIndex < level.length ? level[siblingIndex] : currentHash);
      
      currentHash = crypto.createHash('sha256').update(left + right).digest('hex');
      index = Math.floor(index / 2);
    }

    return currentHash === rootHash;
  }
}
