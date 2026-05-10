/**
 * 🛡️ ZTAN Phase 1B: Runtime Isolation Contracts
 * Defines the sovereign execution boundaries for autonomous agents.
 */

export type SandboxRuntimeClass = "gvisor" | "firecracker" | "docker";

export interface SandboxMount {
  source: string;   // Path on the host or VFS volume ID
  target: string;   // Path inside the sandbox
  mode: "ro" | "rw";
}

export interface SandboxNetworkPolicy {
  outbound: boolean;
  allowedHosts?: string[];
}

export interface SandboxResources {
  cpu: string;      // e.g., "500m" or "1.0"
  memory: string;   // e.g., "512Mi"
  timeoutSeconds: number;
}

export interface SandboxReplayPolicy {
  snapshot: boolean;
  lineageRequired: boolean;
}

export interface SandboxProfile {
  id: string;
  runtime: SandboxRuntimeClass;
  mounts: ReadonlyArray<SandboxMount>;
  network: SandboxNetworkPolicy;
  resources: SandboxResources;
  replay: SandboxReplayPolicy;
}

export type SandboxLifecycleState = 
  | "PROVISIONING" 
  | "READY" 
  | "EXECUTING" 
  | "TERMINATING" 
  | "TERMINATED" 
  | "ERROR"
  /** 🛡️ Formal Execution Finality States */
  | "COMPLETED"     // Execution finished, results available
  | "VERIFIED"      // Hashes and security events validated
  | "FINALIZED";    // Teardown complete, envelope frozen

export interface SandboxTelemetry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  data?: Record<string, any>;
}

export interface SandboxWorkload {
  command: string;
  args: string[];
  env?: Record<string, string>;
  workingDir?: string;
}

/**
 * 🛡️ RuntimeCapabilities
 * Declarative capability contract for isolated runtimes.
 * Allows orchestration to make safety/policy decisions without knowing runtime internals.
 */
export interface RuntimeCapabilities {
  supportsSnapshot: boolean;
  supportsNestedVirtualization: boolean;
  supportsOutboundNetworking: boolean;
  supportsPackageInstallation: boolean;
  supportsGpuAccess: boolean;
  supportsDeterministicReplay: boolean;
  maxExecutionTimeSeconds: number;
  isolationLevel: "process" | "kernel" | "vm";
}

export interface SandboxInstance {
  id: string;
  state: SandboxLifecycleState;
  capabilities: RuntimeCapabilities;
  metadata: Record<string, any>;
}

/**
 * 🛡️ ISandboxProvider
 * The sovereign runtime abstraction layer.
 * All providers (gVisor, Firecracker, WASI) must implement this contract.
 */
export interface ISandboxProvider {
  readonly runtimeClass: SandboxRuntimeClass;
  readonly capabilities: RuntimeCapabilities;

  provision(profile: SandboxProfile): Promise<SandboxInstance>;
  
  execute(
    sandboxId: string,
    workload: SandboxWorkload
  ): Promise<SandboxExecutionResult>;

  destroy(sandboxId: string): Promise<void>;

  // Streaming telemetry for observability and audit logs
  telemetry(sandboxId: string): AsyncIterable<SandboxTelemetry>;
}

export interface SandboxExecutionResult {
  executionId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  metadata: {
    sandboxId: string;
    runtimeClass: SandboxRuntimeClass;
    mountHash: string;
    executionHash: string;
    timestamp: string;
    securityEvent?: string | null;
    canonicalLineage?: string;
  };
}

/** 🛡️ FinalizedEnvelope: The immutable record of execution truth */
export interface FinalizedEnvelope {
  readonly version: string;
  readonly missionId: string;
  readonly executionId: string;
  readonly lineage: {
    readonly mountHash: string;
    readonly executionHash: string;
  };
  readonly outcome: {
    readonly exitCode: number;
    readonly securityEvent: string | null;
  };
  readonly timestamp: string; // ISO 8601
}
