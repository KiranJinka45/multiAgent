-- Multi-Tenant & Platform Core Schema Migration
-- Run this in the Supabase SQL Editor to resolve the "relation tenants does not exist" error.

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create tenant_members table
CREATE TABLE IF NOT EXISTS tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- 3. Sync projects table with multi-tenancy
-- If projects table doesn't have tenant_id, we add it.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='tenant_id') THEN
        ALTER TABLE projects ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Create project_memory table (Required for Incremental Regeneration)
CREATE TABLE IF NOT EXISTS project_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    framework TEXT DEFAULT 'nextjs',
    styling TEXT DEFAULT 'tailwind',
    backend TEXT DEFAULT 'api-routes',
    database_type TEXT DEFAULT 'supabase',
    auth TEXT DEFAULT 'none',
    features JSONB DEFAULT '[]'::jsonb,
    file_manifest JSONB DEFAULT '[]'::jsonb,
    edit_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);
CREATE INDEX IF NOT EXISTS idx_project_memory_project_id ON project_memory(project_id);

-- 5. Helper function for auto-tenant creation (Recommended)
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS trigger AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
  -- Create a default tenant for the new user
  INSERT INTO public.tenants (name)
  VALUES ('My First Workspace')
  RETURNING id INTO new_tenant_id;

  -- Add the user as owner
  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (new_tenant_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run on signup (Optional/uncomment if needed)
-- DROP TRIGGER IF EXISTS on_auth_user_created_tenant ON auth.users;
-- CREATE TRIGGER on_auth_user_created_tenant
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_tenant();
