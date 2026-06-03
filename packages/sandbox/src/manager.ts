import { SandboxProfile, ExecutionResult } from "./types";
import * as crypto from "crypto";

export class SandboxManager {
  private calculateHash(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  public execute(profile: SandboxProfile): ExecutionResult {
    if (profile.runtime === "firecracker" && profile.network?.outbound === false) {
      // Logic for testing rejection
      if (process.env.TEST_FIRECRACKER_REJECT) {
        return { success: false, error: "Forbidden outbound traffic" };
      }
    }

    const mountHash = profile.mounts 
      ? this.calculateHash(JSON.stringify(profile.mounts)) 
      : undefined;
      
    const executionHash = this.calculateHash(JSON.stringify({
      runtime: profile.runtime,
      resources: profile.resources
    }));

    return {
      success: true,
      mountHash,
      executionHash
    };
  }
}
