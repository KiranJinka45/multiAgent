-- ============================================================
-- Phase 1 Migration: Runtime Hardening Columns
--
-- Adds: runtime_version, crash_count, restart_disabled,
--       failure_history (JSONB), last_heartbeat_at
--
-- Non-breaking: all columns have defaults. Existing rows remain valid.
-- ============================================================

-- 1. Versioning column (monotonic counter)
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS runtime_version INTEGER DEFAULT 1;

-- 2. Escalation tracking
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS crash_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS restart_disabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS failure_history JSONB DEFAULT '[]'::jsonb;

-- 3. Heartbeat tracking
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- 4. Index for filtering escalated projects
CREATE INDEX IF NOT EXISTS idx_projects_restart_disabled
    ON projects (restart_disabled) WHERE restart_disabled = true;

-- 5. Index for heartbeat monitoring (find stale heartbeats)
CREATE INDEX IF NOT EXISTS idx_projects_heartbeat
    ON projects (last_heartbeat_at) WHERE runtime_status = 'RUNNING';

-- 6. Verify all new columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN (
    'runtime_version', 'crash_count', 'restart_disabled',
    'failure_history', 'last_heartbeat_at'
  )
ORDER BY column_name;
