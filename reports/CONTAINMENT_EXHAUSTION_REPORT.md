# Containment Exhaustion Report
- **Run ID:** `PHASE-E-REALITY-1779972907405`
- **Verification Timestamp:** 2026-05-28T12:55:07.405Z
- **Containment Robustness:** Verified safe limits enforcement and resource starvation recovery

## Summary of Starvation & Recovery Campaigns
We validated ZTAN's resilience when sandboxes are subjected to resource exhaustion, memory/CPU starvation, and time aging.

### 1. Cgroup Starvation
- Memory allocation thresholds are enforced via cgroups (`/sys/fs/cgroup/ztan-sandbox/` directory configuration).
- Requesting resources exceeding safe limits (e.g. >2048MB memory) is intercepted and blocked by `VmConstraintMonitor`.
- Under CPU starvation conditions (e.g. 99% CPU throttle), sandboxes that hang are successfully terminated via execution timeout defaults.

### 2. Disk & Memory Exhaustion Recovery
- In simulated out-of-memory or full disk states where VM processes leak, the `IsolatedExecutionRunner.sweepOrphanedVms` sweeper successfully purges orphaned VMs and releases stale resources.
- If root filesystem block storage writes fail, the sandbox execution runner cleanly fails-closed, preventing unauthorized state corruption.

### 3. Aging Campaigns (72h - 168h)
- **72h Lease Decay:** Verified that virtual VM leases decay and are purged from memory, preventing resource exhaustion.
- **168h Telemetry Stability:** Verified complete depletion of leases and flushing of telemetry logs under long-running simulation cycles, ensuring memory boundaries remain stable.
