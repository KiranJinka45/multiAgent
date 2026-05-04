-- Migration: Monetization & Private Beta Configuration
-- Path: migrations/20260301_monetization.sql

-- 1. Add Stripe and Beta tracking columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS is_beta_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_cost_usd DECIMAL(12, 4) DEFAULT 0.0000;

-- 2. Create index for Stripe lookups (used in webhooks)
CREATE INDEX IF NOT EXISTS idx_stripe_customer_id ON user_profiles(stripe_customer_id);

-- 3. Create table for granular cost tracking per execution
CREATE TABLE IF NOT EXISTS execution_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    execution_id TEXT NOT NULL,
    project_id UUID NOT NULL,
    tokens_used INT4 NOT NULL,
    cost_usd DECIMAL(12, 4) NOT NULL,
    provider TEXT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on execution_costs (Security standard)
ALTER TABLE execution_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own costs" ON execution_costs
    FOR SELECT USING (auth.uid() = user_id);

-- 5. Function to atomically update total user cost
CREATE OR REPLACE FUNCTION increment_user_cost(user_id_param UUID, cost_param DECIMAL)
RETURNS void AS $$
BEGIN
    UPDATE user_profiles 
    SET total_cost_usd = total_cost_usd + cost_param 
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;
 mission debrief
