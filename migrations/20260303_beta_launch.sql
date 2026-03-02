-- Migration: Beta Launch Configuration
-- Path: migrations/20260303_beta_launch.sql

-- 1. Create Beta Allowlist Table
CREATE TABLE IF NOT EXISTS beta_allowlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    url_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Feedback
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback" ON user_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON user_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin Policy (Role = 'owner') over user_feedback and beta_allowlist
-- Requires user_profiles.role = 'owner'
CREATE POLICY "Owners can view all feedback" ON user_feedback
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'owner')
    );

ALTER TABLE beta_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage allowlist" ON beta_allowlist
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'owner')
    );

-- 3. Add Onboarding Flag to Profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;
