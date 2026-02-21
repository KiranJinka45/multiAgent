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
