-- ====================================================================================================
-- NEXUS ZTAN: HIGH-AVAILABILITY POSTGRESQL INITIALIZATION
-- VERSION: 1.1.0-PROD
-- ====================================================================================================

-- 🛡️ ENABLE VECTOR EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;

-- 🛡️ TABLE: TENANTS (Sovereign Isolation Root)
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 🛡️ TABLE: MISSIONS (DAG Orchestration)
CREATE TABLE IF NOT EXISTS "Mission" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "status" TEXT DEFAULT 'idle',
    "progress" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 🛡️ TABLE: ZTAN_PROOFS (Merkleized Ledger)
CREATE TABLE IF NOT EXISTS "ZtanProof" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "inputHash" TEXT UNIQUE NOT NULL,
    "bundle" JSONB NOT NULL,
    "canonicalHash" TEXT NOT NULL,
    "finalAnchor" TEXT NOT NULL,
    "status" TEXT DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 🛡️ TABLE: OPERATIONAL_SNAPSHOTS (Institutional Evidence)
CREATE TABLE IF NOT EXISTS "OperationalSnapshot" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "epochId" TEXT NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "healthStatus" TEXT NOT NULL,
    "quorumEntropy" DOUBLE PRECISION,
    "activeWitnesses" INTEGER,
    "priesthoodRisk" DOUBLE PRECISION,
    "silenceRisk" DOUBLE PRECISION,
    "infrastructureHealth" DOUBLE PRECISION,
    "legitimacyHealth" DOUBLE PRECISION,
    "sloAdherence" JSONB,
    "operatorMetrics" JSONB,
    "tier" TEXT NOT NULL,
    "hash" TEXT
);

-- 🛡️ OPTIMIZED INDEXING FOR HIGH-DENSITY TRANSACTIONS
CREATE INDEX IF NOT EXISTS "idx_mission_tenant" ON "Mission"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_ztan_proof_hash" ON "ZtanProof"("inputHash");
CREATE INDEX IF NOT EXISTS "idx_snapshot_epoch" ON "OperationalSnapshot"("epochId");
CREATE INDEX IF NOT EXISTS "idx_snapshot_timestamp" ON "OperationalSnapshot"("timestamp");

-- 🛡️ TRIGGER: AUTOMATIC UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON "Tenant" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_mission_updated_at BEFORE UPDATE ON "Mission" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
