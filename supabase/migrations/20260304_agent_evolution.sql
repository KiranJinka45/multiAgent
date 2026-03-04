-- Table for tracking agent-level performance
CREATE TABLE IF NOT EXISTS public.agent_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    success_rate FLOAT DEFAULT 0.0,
    total_tasks INTEGER DEFAULT 0,
    successful_tasks INTEGER DEFAULT 0,
    avg_duration_ms FLOAT DEFAULT 0.0,
    avg_tokens FLOAT DEFAULT 0.0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_name, task_type)
);

-- Table for storing evolved agent strategies
CREATE TABLE IF NOT EXISTS public.agent_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name TEXT NOT NULL,
    strategy_name TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'retired', 'experimental'
    prompt_template TEXT,
    config JSONB DEFAULT '{}',
    win_rate FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to record agent task outcome
CREATE OR REPLACE FUNCTION public.record_agent_performance(
    p_agent_name TEXT,
    p_task_type TEXT,
    p_success BOOLEAN,
    p_duration FLOAT,
    p_tokens FLOAT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.agent_performance (agent_name, task_type, successful_tasks, total_tasks, avg_duration_ms, avg_tokens)
    VALUES (
        p_agent_name, 
        p_task_type, 
        CASE WHEN p_success THEN 1 ELSE 0 END, 
        1, 
        p_duration, 
        p_tokens
    )
    ON CONFLICT (agent_name, task_type) DO UPDATE SET
        successful_tasks = public.agent_performance.successful_tasks + (CASE WHEN p_success THEN 1 ELSE 0 END),
        total_tasks = public.agent_performance.total_tasks + 1,
        success_rate = (public.agent_performance.successful_tasks + (CASE WHEN p_success THEN 1 ELSE 0 END))::FLOAT / (public.agent_performance.total_tasks + 1),
        avg_duration_ms = (public.agent_performance.avg_duration_ms * public.agent_performance.total_tasks + p_duration) / (public.agent_performance.total_tasks + 1),
        avg_tokens = (public.agent_performance.avg_tokens * public.agent_performance.total_tasks + p_tokens) / (public.agent_performance.total_tasks + 1),
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
