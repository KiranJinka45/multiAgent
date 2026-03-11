-- Migration: Retention Tracking
-- Path: migrations/20260302_retention.sql

-- 1. Add tracking columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS first_build_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_build_at TIMESTAMPTZ;

-- 2. Function to update retention timestamps on build
-- This is designed to be called via supabaseAdmin.rpc()
CREATE OR REPLACE FUNCTION update_user_retention_timestamps(user_id_param UUID)
RETURNS void AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        first_build_at = COALESCE(first_build_at, NOW()),
        last_build_at = NOW()
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- 3. Add index for performance on retention queries
CREATE INDEX IF NOT EXISTS idx_user_first_build_at ON user_profiles(first_build_at);
CREATE INDEX IF NOT EXISTS idx_user_last_build_at ON user_profiles(last_build_at);

-- 4. Function to calculate retention metrics
CREATE OR REPLACE FUNCTION get_retention_metrics()
RETURNS JSON AS $$
DECLARE
    total_users INT;
    d1_returns INT;
    d7_returns INT;
    retention_data JSON;
BEGIN
    -- Total users who have at least one build
    SELECT COUNT(*) INTO total_users FROM user_profiles WHERE first_build_at IS NOT NULL;
    
    IF total_users = 0 THEN
        RETURN json_build_object(
            'total_users', 0,
            'd1_retention_rate', 0,
            'd7_retention_rate', 0
        );
    END IF;

    -- D1 Retention: Users whose last build was within 24-48h of first build
    -- Or more simply: percentage of users who returned on Day 1
    SELECT COUNT(*) INTO d1_returns
    FROM user_profiles
    WHERE first_build_at IS NOT NULL
      AND last_build_at::date = (first_build_at::date + interval '1 day');

    -- D7 Retention: Users who were active on or after Day 7
    SELECT COUNT(*) INTO d7_returns
    FROM user_profiles
    WHERE first_build_at IS NOT NULL
      AND last_build_at::date >= (first_build_at::date + interval '7 days');

    SELECT json_build_object(
        'total_users', total_users,
        'd1_retention_rate', ROUND((d1_returns::DECIMAL / total_users) * 100, 2),
        'd7_retention_rate', ROUND((d7_returns::DECIMAL / total_users) * 100, 2),
        'd1_count', d1_returns,
        'd7_count', d7_returns
    ) INTO retention_data;

    RETURN retention_data;
END;
$$ LANGUAGE plpgsql;
