-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 2. Builds Table
CREATE TABLE IF NOT EXISTS builds (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'created',
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

-- 3. Build Events Table
CREATE TABLE IF NOT EXISTS build_events (
    id BIGSERIAL PRIMARY KEY,
    execution_id UUID REFERENCES builds(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    agent_name TEXT,
    action TEXT,
    message TEXT,
    data JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_events ENABLE ROW LEVEL SECURITY;

-- 5. Public Access (For Stress Testing / Admin)
CREATE POLICY "Allow service role full access to projects" ON projects USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access to builds" ON builds USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access to build_events" ON build_events USING (true) WITH CHECK (true);
