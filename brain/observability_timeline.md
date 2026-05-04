# Observability Timeline

The Observability Timeline provides a granular, chronological view of all events occurring during a build execution. This is essential for debugging, performance profiling, and real-time user feedback.

## Build Timeline API

-   **Endpoint**: `GET /api/build-timeline?executionId={id}`
-   **Description**: Fetches all events associated with a specific execution ID from the event stream.

## Event Structure

All events published to the stream follow a standardized structure:

```json
{
  "executionId": "string",
  "timestamp": "ISO8601 string",
  "source": "orchestrator | executor | runner",
  "type": "timer_start | timer_end | log | status_update",
  "label": "string (e.g., 'Meta Phase', 'npm install')",
  "durationMs": "number (optional, for timer_end)",
  "payload": "object (optional, event-specific data)"
}
```

## High-Level Stages (Timed)

The following stages are wrapped in timers to track duration:

1.  **Meta Phase**: Context gathering and initial analysis.
2.  **Planner Phase**: Designing the implementation strategy.
3.  **Builder Phase**: Executing the changes and generating code.
4.  **Preview Phase**: Launching and verifying the build.

## Individual Agent Timings

Each agent's execution within the `executor.ts` is also timed to identify performance bottlenecks at the agent level.

## Storage (Redis)

Events are streamed to Redis using a key pattern: `build:stream:{executionId}`. This allows for fast, real-time retrieval and persistent storage for post-mortem analysis.
