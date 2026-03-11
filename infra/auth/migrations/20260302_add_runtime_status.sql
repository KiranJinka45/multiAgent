-- ============================================================
-- Migration: Add runtime_status column to projects table
-- Runs in Supabase SQL Editor or via supabase db push
--
-- IMPORTANT: This does NOT modify the existing `status` column.
-- Runtime lifecycle is tracked separately from infra provisioning.
-- ============================================================

-- 1. Add runtime_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'runtime_status_enum') THEN
        CREATE TYPE runtime_status_enum AS ENUM (
            'PROVISIONED',
            'STARTING',
            'RUNNING',
            'FAILED',
            'STOPPED'
        );
    END IF;
END$$;

-- 2. Add runtime columns to projects table
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS runtime_status runtime_status_enum DEFAULT 'PROVISIONED',
    ADD COLUMN IF NOT EXISTS preview_url    TEXT,
    ADD COLUMN IF NOT EXISTS preview_port   INTEGER,
    ADD COLUMN IF NOT EXISTS runtime_pid    INTEGER,
    ADD COLUMN IF NOT EXISTS runtime_started_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS runtime_updated_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS runtime_failure_reason TEXT;

-- 3. Index for fast runtime status queries (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_projects_runtime_status
    ON projects (runtime_status);

-- 4. Index for finding running projects by user
CREATE INDEX IF NOT EXISTS idx_projects_user_runtime
    ON projects (user_id, runtime_status);

-- 5. RLS: Users can only read their own project runtime data (already covered by existing RLS)
-- No additional policies needed — runtime_status inherits the projects table RLS.

-- 6. Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('runtime_status', 'preview_url', 'preview_port', 'runtime_pid')
ORDER BY column_name;
