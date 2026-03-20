-- Phase 17: AI Evaluation System
CREATE TABLE IF NOT EXISTS ai_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  model TEXT NOT NULL,
  score FLOAT NOT NULL,
  metrics JSONB NOT NULL, -- { buildSuccess: 1, lintScore: 0.8, typeScore: 0.9, testScore: 0.7, diffScore: 0.5 }
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_eval_tenant ON ai_evaluations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_eval_model ON ai_evaluations(model);

-- Phase 18: Enterprise Audit Logs (SOC2)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  hash TEXT NOT NULL, -- SHA-256 Hash Chaining
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- Enable RLS for Audit Logs (Enterprise Security)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view audit logs
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'ADMIN'
    )
  );
