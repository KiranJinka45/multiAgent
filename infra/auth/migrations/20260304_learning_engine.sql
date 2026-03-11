-- Create the fix patterns table for the Learning Engine
CREATE TABLE IF NOT EXISTS public.ai_fix_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_signature TEXT NOT NULL UNIQUE,
    fix_strategy TEXT NOT NULL,
    success_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_fix_patterns ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read (for the agents to query known fixes)
CREATE POLICY "Allow anonymous read" ON public.ai_fix_patterns
    FOR SELECT USING (true);

-- Allow service role to manage everything
CREATE POLICY "Allow service_role full access" ON public.ai_fix_patterns
    FOR ALL USING (auth.role() = 'service_role');

-- Create an RPC to increment success count atomically
CREATE OR REPLACE FUNCTION public.increment_fix_success(sig TEXT, strategy TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.ai_fix_patterns (error_signature, fix_strategy, success_count)
    VALUES (sig, strategy, 1)
    ON CONFLICT (error_signature)
    DO UPDATE SET 
        success_count = ai_fix_patterns.success_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
