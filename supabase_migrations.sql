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
