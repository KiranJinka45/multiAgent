-- Production Architecture Schema (10-Layer Spec)

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 2. Builds/Executions Table (Layer 9: Atomic State)
CREATE TABLE IF NOT EXISTS builds (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'created', -- created, building, completed, failed
    current_stage TEXT,
    progress_percent INTEGER DEFAULT 0,
    message TEXT,
    tokens_used INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    cost_usd NUMERIC(10, 5) DEFAULT 0,
    preview_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 3. Build Events Table (Event Sourcing)
CREATE TABLE IF NOT EXISTS build_events (
    id BIGSERIAL PRIMARY KEY,
    execution_id UUID REFERENCES builds(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- stage, agent, progress, error, complete
    agent_name TEXT,
    action TEXT,
    message TEXT,
    data JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_build_events_execution_id ON build_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_builds_project_id ON builds(project_id);
