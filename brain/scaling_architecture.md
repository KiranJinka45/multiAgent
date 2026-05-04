# Scaling Architecture

MultiAgent is designed for high-concurrency SaaS workloads using a distributed, event-driven architecture.

## System Flow

The following flow describes how a user request (Prompt) is processed and scaled across the cluster:

1.  **Gateway (API Gateway)**:
    *   Entry point for all user requests.
    *   Handles authentication, rate limiting, and request validation.
    *   Directs requests to the appropriate internal services.

2.  **BullMQ (Task Queueing)**:
    *   Requests are converted into jobs and pushed into a BullMQ queue managed by Redis.
    *   Provides horizontal scalability by allowing multiple workers to consume jobs from the same queue.
    *   Ensures reliable processing with automatic retries and job status tracking.

3.  **Worker Pool**:
    *   A set of independent worker processes (or containers) that subscribe to the BullMQ jobs.
    *   Each worker picks up a job and initializes a execution context.

4.  **VFS Snapshot (Virtual File System)**:
    *   Before processing starts, a snapshot of the current project state is taken or retrieved from the VFS.
    *   Ensures that agents work on a consistent and isolated view of the codebase.

5.  **Agent Cluster (Multi-Agent Execution)**:
    *   The `Orchestrator` within the worker coordinates the `Agent Cluster` (Meta, Planner, Builder, etc.).
    *   Agents communicate via an event bus to collaborate on the task.
    *   The execution is scoped to the specific job to prevent state leakage between concurrent builds.

## Scalability & Resilience Features

-   **Horizontal Scalability**: Stateless API nodes and independent workers allow for infinite horizontal scaling.
-   **WebSocket Mesh**: Clustering is achieved via the `Socket.io Redis Adapter`, ensuring log synchronicity across all nodes.
-   **Autonomous Recovery**: The `MissionWatchdog` periodically reconciles stale missions, re-queueing orphaned jobs if a worker node fails.
-   **Resource Isolation**: `SandboxRunner` is fully implemented, offloading high-cpu/blocking tasks to isolated runtimes to maintain worker responsiveness.
-   **Advisory VFS Locking**: Concurrent project operations are protected by a distributed Redis-based lock to ensure snapshot integrity.
-   **Backpressure Management**: BullMQ handles load spikes, preventing system exhaustion during high-concurrency bursts.
