-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'user',
    membership TEXT DEFAULT 'free',
    last_payment_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: In a production app you'd want RLS policies here. 
-- Since we just need it for Owner Override and Stripe webhooks right now:
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);

-- Create audit_owner_override_logs table
CREATE TABLE IF NOT EXISTS audit_owner_override_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    execution_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    tokens_used INT DEFAULT 0,
    build_duration_sec INT DEFAULT 0
);

-- Enable RLS for the audit logs (Admin/Service Role only)
ALTER TABLE audit_owner_override_logs ENABLE ROW LEVEL SECURITY;

-- Note: We only insert via Service Role, so no public policies are needed.
-- You can view this via Supabase Studio or as an Admin.
