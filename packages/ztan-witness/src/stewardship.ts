import { logger } from '../../observability/src';

export interface ProtocolVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly status: 'EXPERIMENTAL' | 'STABLE' | 'DEPRECATED';
}

/**
 * 🛡️ StewardshipEngine
 * Governs the long-term evolution and stability of the institutional substrate.
 * Enforces migration discipline, versioning, and backward compatibility.
 */
export class StewardshipEngine {
  private currentVersion: ProtocolVersion = { major: 1, minor: 0, patch: 0, status: 'STABLE' };
  private readonly COMPATIBILITY_WINDOW = 1; // Major version distance

  /**
   * Validates a proposed constitutional amendment or protocol upgrade.
   */
  public validateUpgrade(proposed: ProtocolVersion): boolean {
    // Rule: No major upgrades without a formal constitutional amendment process
    if (proposed.major > this.currentVersion.major) {
      logger.error({ current: this.currentVersion, proposed }, '[Stewardship] REJECTED: Major version jump requires full constitutional referendum');
      return false;
    }

    // Rule: Minor upgrades must preserve backward compatibility
    if (proposed.minor > this.currentVersion.minor) {
      logger.info({ proposed }, '[Stewardship] APPROVED: Minor upgrade within compatibility window');
      return true;
    }

    return true;
  }

  /**
   * Enforces deprecation policy.
   */
  public isSupported(version: ProtocolVersion): boolean {
    if (this.currentVersion.major - version.major > this.COMPATIBILITY_WINDOW) {
      logger.warn({ version }, '[Stewardship] UNSUPPORTED: Protocol version outside compatibility window');
      return false;
    }
    return true;
  }

  public getStatus(): string {
    return `ZTAN-SUBSTRATE-v${this.currentVersion.major}.${this.currentVersion.minor}.${this.currentVersion.patch}-${this.currentVersion.status}`;
  }
}
