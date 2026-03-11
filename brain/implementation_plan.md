# Scaling & SaaS Readiness Implementation Plan

We have successfully stabilized the local runtime. Now we will focus on making MultiAgent ready for high-concurrency SaaS workloads.

## User Review Required

> [!IMPORTANT]
> **State Isolation Bug**: I've identified that the `TaskExecutor` currently uses a singleton-style state (`isRunning`, `concurrentTasks`) which causes concurrent builds on the same worker to fail silently or "freeze". I will refactor this to be execution-scoped.

## Proposed Changes

### Documentation & Visibility
---
#### [NEW] [scaling_architecture.md](file:///C:/multiAgentic_system/MultiAgent/brain/scaling_architecture.md)
- Document the distributed flow: Gateway -> BullMQ -> Worker Pool -> VFS Snapshot -> Agent Cluster.

#### [NEW] [observability_timeline.md](file:///C:/multiAgentic_system/MultiAgent/brain/observability_timeline.md)
- Document the Build Timeline API and event structure.

### Observability & Debugging
---
#### [MODIFY] [orchestrator.ts](file:///C:/multiAgentic_system/MultiAgent/services/orchestrator.ts)
- Wrap high-level stages (Meta, Planner, Builder) in `eventBus.startTimer`.

#### [MODIFY] [executor.ts](file:///C:/multiAgentic_system/MultiAgent/services/task-engine/executor.ts)
- Wrap individual agent executions in `eventBus.startTimer`.

#### [NEW] [api/build-timeline/route.ts](file:///C:/multiAgentic_system/MultiAgent/app/api/build-timeline/route.ts)
- GET handler to fetch all events from `build:stream:{executionId}` and return a chronological timeline.

### Build Runner Layer (Isolation)
---
#### [NEW] [sandbox-runner.ts](file:///C:/multiAgentic_system/MultiAgent/services/runtime/sandbox-runner.ts)
- Utility to spawn **isolated child processes** for high-risk operations:
    - `npm install / build`
    - `docker build / run`
    - `next dev / vite`
- **Features**:
    - **Resource Watchdog**: Kills sub-processes exceeding 512MB RAM or 2min CPU time.
    - **Isolation**: Each runner has its own working directory and env vars.
    - **Streaming**: Redirects `stdout/stderr` directly to `eventBus.thought`.

#### [MODIFY] [orchestrator.ts](file:///C:/multiAgentic_system/MultiAgent/services/orchestrator.ts)
- Refactor `finalizeFastPath` and `previewRunner` to use `SandboxRunner.execute`.
- Ensure the main `build-worker` process remains lightweight.
- Implement "Zombie Cleanup" for any orphaned runner processes.

#### [MODIFY] [preview-manager.ts](file:///C:/multiAgentic_system/MultiAgent/runtime/preview-manager.ts)
- Refactor to use `SandboxRunner` for launching dev servers, ensuring they run as tracked sub-processes.

### Control Plane & Monitoring
---
#### [NEW] [api/system-health/route.ts](file:///C:/multiAgentic_system/MultiAgent/app/api/system-health/route.ts)
- Expose status of Docker, Redis, and active worker count.

#### [NEW] [api/queue-health/route.ts](file:///C:/multiAgentic_system/MultiAgent/app/api/queue-health/route.ts)
- Return BullMQ metrics: waiting, active, completed, and failed jobs.

#### [NEW] [api/workers/route.ts](file:///C:/multiAgentic_system/MultiAgent/app/api/workers/route.ts)
- List registered workers and their current load.

#### [NEW] [dashboard/page.tsx](file:///C:/multiAgentic_system/MultiAgent/app/dashboard/page.tsx)
- Unified command center UI for real-time observability.
- **Visualizer Extension**: Add a canvas/SVG based flow chart showing the live progress of builds through agents.

### Phase 7: Production Architecture & Final Polish
---
#### [MODIFY] [Folder Structure](file:///C:/multiAgentic_system/MultiAgent/)
- Standardize the project into a **Production-Grade 25-Folder Structure** (Agents, Services, Workers, Runtime, Infrastructure, etc.) to ensure long-term maintenance.
- Clean up legacy scripts and temporary test files.

#### [NEW] [platform_architecture.md](file:///C:/multiAgentic_system/MultiAgent/brain/platform_architecture.md)
- Complete end-to-end technical specification of the MultiAgent system.

## Verification Plan

### Automated Timeline Test
- Run `scripts/test-timeline.ts` to trigger a build and then poll `/api/build-timeline`.

### Runner Isolation Test
- Execute a build that intentionally consumes excessive memory or hangs and verify termination.

### Control Plane Check
- Hit `/api/system-health` and verify all infrastructure components are reported correctly.
- Stress test the queue and verify `/api/queue-health` reflects the spike in waiting jobs.

### Platform Pulse (Final)
- Execute `scripts/platform-pulse.ts` to verify the complete loop from Prompt -> Queue -> Runner -> Timeline -> Dashboard.
