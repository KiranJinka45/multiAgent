-- Create the tenants table for organization-level management
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
    owner_id UUID REFERENCES auth.users(id),
    max_projects INTEGER DEFAULT 3,
    max_tokens_monthly INTEGER DEFAULT 1000000,
    tokens_used_this_month INTEGER DEFAULT 0,
    build_minutes_monthly INTEGER DEFAULT 60,
    build_minutes_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link projects to tenants
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant" ON public.tenants
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Service role full access tenants" ON public.tenants
    FOR ALL USING (auth.role() = 'service_role');

-- Simple function to increment token usage
CREATE OR REPLACE FUNCTION public.increment_tenant_tokens(t_id UUID, token_count INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.tenants
    SET tokens_used_this_month = tokens_used_this_month + token_count,
        updated_at = NOW()
    WHERE id = t_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
