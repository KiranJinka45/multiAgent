-- Create chats table
create table chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create messages table
create table messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table chats enable row level security;
alter table messages enable row level security;

-- Policies for chats
create policy "Users can view own chats" on chats for select using (auth.uid() = user_id);
create policy "Users can insert own chats" on chats for insert with check (auth.uid() = user_id);
create policy "Users can update own chats" on chats for update using (auth.uid() = user_id);
create policy "Users can delete own chats" on chats for delete using (auth.uid() = user_id);
-- Update chats table with new status columns
alter table chats add column if not exists is_pinned boolean default false;
alter table chats add column if not exists is_archived boolean default false;
alter table chats add column if not exists is_public boolean default false;

-- Policies for messages
create policy "Users can view own messages" on messages for select using (
  exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
);
create policy "Users can insert own messages" on messages for insert with check (
  exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
);

-- Phase 1: Projects Foundation
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  status text not null default 'draft',
  project_type text,
  deployment_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_files (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  path text not null,
  content text,
  language text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, path)
);

-- Enable RLS for Projects
alter table projects enable row level security;
alter table project_files enable row level security;

-- Policies for projects
create policy "Users can view own projects" on projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on projects for delete using (auth.uid() = user_id);

-- Policies for project_files
create policy "Users can view own project files" on project_files for select using (
  exists (select 1 from projects where projects.id = project_files.project_id and projects.user_id = auth.uid())
);
create policy "Users can insert own project files" on project_files for insert with check (
  exists (select 1 from projects where projects.id = project_files.project_id and projects.user_id = auth.uid())
);
create policy "Users can update own project files" on project_files for update using (
  exists (select 1 from projects where projects.id = project_files.project_id and projects.user_id = auth.uid())
);
create policy "Users can delete own project files" on project_files for delete using (
  exists (select 1 from projects where projects.id = project_files.project_id and projects.user_id = auth.uid())
);

-- Phase 2: AI Orchestration Tables
CREATE TABLE IF NOT EXISTS agents_execution (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID REFERENCES projects(id) ON DELETE CASCADE, agent_name TEXT, input_json JSONB, output_json JSONB, status TEXT);
CREATE TABLE IF NOT EXISTS build_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID REFERENCES projects(id) ON DELETE CASCADE, phase TEXT, log_output TEXT, success BOOLEAN);
CREATE TABLE IF NOT EXISTS error_memory (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), error_hash TEXT, resolution_patch JSONB);
CREATE TABLE IF NOT EXISTS deployments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID REFERENCES projects(id) ON DELETE CASCADE, vercel_url TEXT, render_url TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS usage_tracking (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID REFERENCES projects(id) ON DELETE CASCADE, tokens_used INT, feature TEXT);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS generating BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS building BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS debugging BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deployed BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS failed BOOLEAN DEFAULT FALSE;

-- Phase 3: Reliability Metrics & Observability Updates
ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_version_hash TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS build_success_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS average_retry_count DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS average_build_time_sec INT DEFAULT 0;

ALTER TABLE error_memory ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE error_memory ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS agent_execution_time_sec INT DEFAULT 0;
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS error_frequency INT DEFAULT 0;

-- Feature Registry Table (to reduce LLM dependency via prebuilt modules)
CREATE TABLE IF NOT EXISTS feature_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT NOT NULL UNIQUE,
    module_path TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Phase 4: Statistical Reliability & Controlled Alpha Economics
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_tokens_used INT DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_cost_inr DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS alpha_feedback TEXT;

CREATE TABLE IF NOT EXISTS alpha_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL UNIQUE,
    builds_remaining INT DEFAULT 5,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    reliability_index DECIMAL(5,4) DEFAULT 0.0000,
    build_success_rate DECIMAL(5,4) DEFAULT 0.0000,
    deployment_success_rate DECIMAL(5,4) DEFAULT 0.0000,
    auto_classification_rate DECIMAL(5,4) DEFAULT 0.0000,
    retry_efficiency DECIMAL(5,4) DEFAULT 0.0000,
    token_efficiency DECIMAL(5,4) DEFAULT 0.0000,
    gross_margin_health TEXT DEFAULT 'UNKNOWN'
);

-- Phase 5: Controlled Chaos & Human Alpha Feedback Schema
CREATE TABLE IF NOT EXISTS alpha_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_intent TEXT,
    expected_outcome TEXT,
    actual_outcome TEXT,
    time_to_resolution_sec INT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Internal Dashboard metrics view table
CREATE TABLE IF NOT EXISTS risk_score_dashboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    live_build_success_rate DECIMAL(5,4) DEFAULT 0.0000,
    concurrency_stability_score DECIMAL(5,4) DEFAULT 1.0000,
    avg_resolution_time_sec INT DEFAULT 0,
    gross_margin_pct DECIMAL(5,2) DEFAULT 0.00,
    active_alpha_users INT DEFAULT 0,
    system_status TEXT DEFAULT 'STABLE'
);

-- Phase 5.6: Silent Internal Alpha (Founder Abuse Mode)
CREATE TABLE IF NOT EXISTS internal_abuse_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    abuse_category TEXT NOT NULL, -- e.g., 'architect_ambiguity', 'patch_recursion', 'token_spike'
    triggering_input TEXT,
    system_response TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
