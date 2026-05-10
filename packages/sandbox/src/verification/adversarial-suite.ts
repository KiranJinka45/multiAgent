import { SandboxWorkload } from '../types';

/**
 * 💣 AdversarialWorkloadSuite
 * A collection of hostile workloads designed to test sandbox isolation boundaries.
 */
export const AdversarialWorkloadSuite: Record<string, SandboxWorkload> = {
  // --- FILESYSTEM ESCAPE ATTEMPTS ---
  FS_TRAVERSAL: {
    command: "ls",
    args: ["../../../../etc/passwd"],
    description: "Attempt to traverse out of the mounted workspace into the host filesystem."
  },
  SYMLINK_ESCAPE: {
    command: "sh",
    args: ["-c", "ln -s /etc/shadow ./shadow_link && cat ./shadow_link"],
    description: "Attempt to escape via symlink creation pointing to sensitive host files."
  },
  MOUNT_INSPECTION: {
    command: "cat",
    args: ["/proc/mounts"],
    description: "Attempt to inspect the host mount table and identify escape vectors."
  },

  // --- NETWORK ISOLATION ATTEMPTS ---
  OUTBOUND_HTTP: {
    command: "curl",
    args: ["-I", "https://google.com"],
    description: "Attempt to reach the public internet from an air-gapped environment."
  },
  DNS_RESOLUTION: {
    command: "nslookup",
    args: ["internal.service.local"],
    description: "Attempt to perform service discovery on the internal network."
  },
  METADATA_ACCESS: {
    command: "curl",
    args: ["http://169.254.169.254/latest/meta-data/"],
    description: "Attempt to access cloud provider metadata (IMDSv2)."
  },

  // --- RESOURCE EXHAUSTION ATTEMPTS ---
  FORK_BOMB: {
    command: "sh",
    args: ["-c", ":(){ :|:& };:"],
    description: "Attempt to crash the host/sandbox via process proliferation."
  },
  MEMORY_SATURATION: {
    command: "sh",
    args: ["-c", "python3 -c 'a = [1] * (10**9)'"],
    description: "Attempt to trigger OOM and destabilize the host."
  },

  // --- PERSISTENCE ATTEMPTS ---
  BACKGROUND_PROCESS: {
    command: "sh",
    args: ["-c", "sleep 1000 & disown"],
    description: "Attempt to leave a background process running after sandbox teardown."
  },
  MOUNT_MUTATION: {
    command: "sh",
    args: ["-c", "touch /workspace/mutation_test && chmod 000 /workspace/mutation_test"],
    description: "Attempt to mutate shared mount permissions."
  }
};
