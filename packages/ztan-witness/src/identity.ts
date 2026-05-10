import * as crypto from 'crypto';

/**
 * 🛡️ WitnessIdentity
 * The sovereign identifier for an institutional observer.
 */
export interface WitnessIdentity {
  readonly witnessId: string;
  readonly publicKey: string;
  readonly trustScope: string[];
  readonly registeredAt: string;
}

/**
 * 🛡️ IdentityRegistry
 * Manages the set of authorized institutional witnesses.
 */
export class IdentityRegistry {
  private authorizedWitnesses: Map<string, WitnessIdentity> = new Map();

  /**
   * Registers a new witness in the institutional set.
   */
  public register(publicKey: string, trustScope: string[]): WitnessIdentity {
    // Derive a unique ID from the public key (SHA256 fingerprint)
    const witnessId = crypto.createHash('sha256')
      .update(publicKey)
      .digest('hex');

    const identity: WitnessIdentity = {
      witnessId,
      publicKey,
      trustScope,
      registeredAt: new Date().toISOString()
    };

    this.authorizedWitnesses.set(witnessId, identity);
    return Object.freeze(identity);
  }

  public getWitness(witnessId: string): WitnessIdentity | null {
    return this.authorizedWitnesses.get(witnessId) || null;
  }

  public isAuthorized(witnessId: string): boolean {
    return this.authorizedWitnesses.has(witnessId);
  }
}
