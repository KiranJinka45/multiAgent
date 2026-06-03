export type RuntimeType = "gvisor" | "firecracker";

export interface SandboxProfile {
  runtime: RuntimeType;
  mounts?: { source: string; target: string; mode: string }[];
  network?: { outbound: boolean };
  resources?: { cpu: string; memory: string; timeoutSeconds: number };
}

export interface ExecutionResult {
  success: boolean;
  mountHash?: string;
  executionHash?: string;
  error?: string;
}
