-- Project Memory Table
-- Stores AI context, file manifests, and edit history for incremental editing
CREATE TABLE IF NOT EXISTS project_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    framework TEXT DEFAULT 'nextjs',
    styling TEXT DEFAULT 'tailwind',
    backend TEXT DEFAULT 'api-routes',
    database TEXT DEFAULT 'supabase',
    auth TEXT DEFAULT 'none',
    features JSONB DEFAULT '[]'::jsonb,
    file_manifest JSONB DEFAULT '[]'::jsonb,
    edit_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);

-- Index for fast lookups by project
CREATE INDEX IF NOT EXISTS idx_project_memory_project_id ON project_memory(project_id);

-- Enable RLS
ALTER TABLE project_memory ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own project memory via project ownership
CREATE POLICY "Users can read own project memory" ON project_memory
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- Service role can do everything
CREATE POLICY "Service role full access to project_memory" ON project_memory
    FOR ALL USING (true) WITH CHECK (true);
