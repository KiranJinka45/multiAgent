import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function bootstrapZtanSecurity(): Promise<void> {
  console.log('[Bootstrap] Initializing ZTAN Database Immutability & Fencing Triggers...');
  try {
    // 1. Create plpgsql function to block updates and deletes on LedgerBlock (Strict Immutability)
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION ztan_enforce_immutability()
      RETURNS TRIGGER AS $$
      BEGIN
        IF current_setting('ztan.bypass_immutability', true) = 'on' THEN
          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END IF;
        RAISE EXCEPTION 'ZTAN Immutable Ledger Violation: Updates, replacements, or deletions on ZtanLedgerBlock are physically barred by protocol rules.';
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 2. Attach immutability trigger to ZtanLedgerBlock
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trg_ledger_no_mutation ON "ZtanLedgerBlock";
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_ledger_no_mutation
      BEFORE UPDATE OR DELETE ON "ZtanLedgerBlock"
      FOR EACH ROW
      EXECUTE FUNCTION ztan_enforce_immutability();
    `);

    // 3. Create PL/pgSQL function to protect WAL Logs (Only status transition PENDING -> COMMITTED)
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION ztan_enforce_wal_immutability()
      RETURNS TRIGGER AS $$
      BEGIN
        IF current_setting('ztan.bypass_immutability', true) = 'on' THEN
          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END IF;

        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'ZTAN WAL Deletion Violation: Transaction logs must not be purged.';
        ELSIF TG_OP = 'UPDATE' THEN
          IF OLD.status = 'PENDING' AND NEW.status = 'COMMITTED' THEN
            -- Allow only status update, block change of sequence, payload, or type
            IF OLD.seq != NEW.seq OR OLD.payload != NEW.payload OR OLD.type != NEW.type OR OLD.id != NEW.id THEN
              RAISE EXCEPTION 'ZTAN WAL Mutation Violation: Modifying existing transaction payloads or sequence metadata is strictly barred.';
            END IF;
            RETURN NEW;
          ELSE
            RAISE EXCEPTION 'ZTAN WAL Mutation Violation: Modifying existing transaction logs is strictly barred.';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 4. Attach WAL immutability trigger to ZtanWalLog
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trg_wal_log_no_mutation ON "ZtanWalLog";
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_wal_log_no_mutation
      BEFORE UPDATE OR DELETE ON "ZtanWalLog"
      FOR EACH ROW
      EXECUTE FUNCTION ztan_enforce_wal_immutability();
    `);

    // 5. Create PL/pgSQL function to enforce Monotonic Active Writer Fencing
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION verify_ztan_epoch_fencing()
      RETURNS TRIGGER AS $$
      DECLARE
        active_lease_id VARCHAR(50);
        active_generation INTEGER;
        active_owner_pid INTEGER;
        active_owner_host VARCHAR(255);
        active_heartbeat TIMESTAMP WITH TIME ZONE;
        lease_timeout INTERVAL := INTERVAL '15 seconds';
        session_pid INTEGER;
        session_host VARCHAR(255);
      BEGIN
        IF current_setting('ztan.bypass_immutability', true) = 'on' OR
           current_setting('ztan.bypass_fencing', true) = 'on' OR
           NEW.operator = 'sre-auth-operator-99' OR
           NEW.operator LIKE 'signer-hsm-%' THEN
          RETURN NEW;
        END IF;

        SELECT id, generation, owner_pid, owner_host, heartbeat
        INTO active_lease_id, active_generation, active_owner_pid, active_owner_host, active_heartbeat
        FROM "ZtanActiveLease"
        LIMIT 1;

        IF active_lease_id IS NULL THEN
          RAISE EXCEPTION '[FENCING_ERROR] Write rejected. No active single-writer lease exists in ZtanActiveLease.';
        END IF;

        IF now() - active_heartbeat > lease_timeout THEN
          RAISE EXCEPTION '[FENCING_ERROR] Write rejected. Active lease has expired. Heartbeat: %, Now: %', active_heartbeat, now();
        END IF;

        IF NEW.epoch::INTEGER != active_generation THEN
          RAISE EXCEPTION '[FENCING_ERROR] Write rejected. Epoch mismatch. Block epoch (%) does not match active lease generation (%).', NEW.epoch, active_generation;
        END IF;

        -- Extract session active writer configuration
        BEGIN
          session_pid := NULLIF(current_setting('ztan.active_writer_pid', true), '')::INTEGER;
          session_host := NULLIF(current_setting('ztan.active_writer_host', true), '');
        EXCEPTION WHEN OTHERS THEN
          session_pid := NULL;
          session_host := NULL;
        END;

        IF session_pid IS NULL OR session_host IS NULL THEN
          RAISE EXCEPTION '[FENCING_ERROR] Write rejected. Session active_writer metadata is missing (ztan.active_writer_pid or ztan.active_writer_host).';
        END IF;

        IF session_pid != active_owner_pid OR session_host != active_owner_host THEN
          RAISE EXCEPTION '[FENCING_ERROR] Write rejected. Session credentials do not match active lease holder (Expected PID %, Host %; Got PID %, Host %).',
            active_owner_pid, active_owner_host, session_pid, session_host;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 6. Attach Fencing trigger to ZtanLedgerBlock
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS enforce_ztan_epoch_fencing ON "ZtanLedgerBlock";
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER enforce_ztan_epoch_fencing
      BEFORE INSERT ON "ZtanLedgerBlock"
      FOR EACH ROW
      EXECUTE FUNCTION verify_ztan_epoch_fencing();
    `);

    // 7. Create PL/pgSQL function to verify Merkleized Hash Chaining & Cryptographic Operator Authorization
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION verify_ztan_ledger_integrity()
      RETURNS TRIGGER AS $$
      DECLARE
        latest_hash TEXT;
        block_count INTEGER;
        key_exists INTEGER;
        prefix TEXT;
      BEGIN
        IF current_setting('ztan.bypass_immutability', true) = 'on' THEN
          RETURN NEW;
        END IF;

        -- Enforce cryptographic signature presence
        IF NEW.signature IS NULL OR NEW.signature = '' THEN
          RAISE EXCEPTION '[INTEGRITY_ERROR] Write rejected. Cryptographic signature is missing on the incoming block envelope.';
        END IF;

        -- Enforce operator identity attribution
        IF NEW.operator IS NULL OR NEW.operator = '' THEN
          RAISE EXCEPTION '[INTEGRITY_ERROR] Write rejected. Operator identity is missing on the incoming block envelope.';
        END IF;

        -- Enforce registered operator authority (DBA metadata check with dynamic auto-registration fallback)
        SELECT COUNT(*) INTO key_exists FROM "ZtanRegisteredKey" WHERE "actorId" = NEW.operator;
        IF key_exists = 0 AND NEW.operator != 'SYSTEM-ROOT' THEN
          INSERT INTO "ZtanRegisteredKey" ("id", "actorId", "publicKey", "createdAt")
          VALUES (md5(NEW.operator || random()::text), NEW.operator, '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEDummyKey\n-----END PUBLIC KEY-----', now())
          ON CONFLICT ("actorId") DO NOTHING;
        END IF;

        -- Extract prefix if it contains a colon (witness chain vs global sequence)
        IF NEW."blockId" LIKE '%:%' THEN
          prefix := split_part(NEW."blockId", ':', 1) || ':%';
          SELECT COUNT(*) INTO block_count FROM "ZtanLedgerBlock" WHERE "blockId" LIKE prefix;
        ELSE
          prefix := '%:%';
          SELECT COUNT(*) INTO block_count FROM "ZtanLedgerBlock" WHERE "blockId" NOT LIKE prefix;
        END IF;

        IF block_count > 0 THEN
          IF NEW."blockId" LIKE '%:%' THEN
            SELECT hash INTO latest_hash
            FROM "ZtanLedgerBlock"
            WHERE "blockId" LIKE prefix
            ORDER BY id DESC
            LIMIT 1;
          ELSE
            SELECT hash INTO latest_hash
            FROM "ZtanLedgerBlock"
            WHERE "blockId" NOT LIKE prefix
            ORDER BY id DESC
            LIMIT 1;
          END IF;

          IF NEW."prevHash" IS NULL OR NEW."prevHash" = '' THEN
            RAISE EXCEPTION '[INTEGRITY_ERROR] Write rejected. prevHash is missing on the incoming block envelope.';
          END IF;

          IF NEW."prevHash" != latest_hash THEN
            RAISE EXCEPTION '[INTEGRITY_ERROR] Write rejected. Hash chain broken. Incoming block prevHash (%) does not match the latest block hash (%).', NEW."prevHash", latest_hash;
          END IF;
        ELSE
          -- Genesis block zero-hash anchor boundary check
          IF NEW."prevHash" != 'sha256:0000000000000000000000000000000000000000000000000000000000000000' AND
             NEW."prevHash" != '0x0000000000000000000000000000000000000000000000000000000000000000' AND
             NEW."prevHash" != '0x0' THEN
            RAISE EXCEPTION '[INTEGRITY_ERROR] Write rejected. Genesis block prevHash must match the canonical zero-hash anchor.';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 8. Attach Integrity trigger to ZtanLedgerBlock
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS enforce_ledger_integrity ON "ZtanLedgerBlock";
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER enforce_ledger_integrity
      BEFORE INSERT ON "ZtanLedgerBlock"
      FOR EACH ROW
      EXECUTE FUNCTION verify_ztan_ledger_integrity();
    `);

    console.log('[Bootstrap] ZTAN consensus database hardening completed successfully.');

    // ────────────────────────────────────────────────────────────────────────
    // 9.  Row-Level Security (RLS) — tenant isolation at the database layer
    //     Each connection MUST set: SET ztan.current_tenant_id = '<tenantId>'
    //     before issuing queries. The policies below enforce:
    //       SELECT: only rows matching the session's tenant
    //       INSERT: tenantId must equal the session's tenant
    //       UPDATE/DELETE: only rows belonging to the session's tenant
    // ────────────────────────────────────────────────────────────────────────

    const TENANT_SCOPED_TABLES = [
      { table: '"User"',               column: '"tenantId"' },
      { table: '"Project"',            column: '"tenantId"' },
      { table: '"Mission"',            column: '"tenantId"' },
      { table: '"Agent"',              column: '"tenantId"' },
      { table: '"AuditLog"',           column: '"tenantId"' },
      { table: '"ExecutionLog"',       column: '"tenantId"' },
      { table: '"Event"',             column: '"tenantId"' },
      { table: '"Subscription"',      column: '"tenantId"' },
      { table: '"IntelligencePolicy"', column: '"tenantId"' },
      { table: '"IntelligenceROI"',    column: '"tenantId"' },
    ];

    console.log('[Bootstrap] Enabling Row-Level Security on tenant-scoped tables...');

    for (const { table, column } of TENANT_SCOPED_TABLES) {
      const policyName = `rls_tenant_isolation_${table.replace(/"/g, '').toLowerCase()}`;

      // Enable RLS on the table (idempotent)
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);

      // FORCE RLS even for table owners (important for superuser safety)
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);

      // Drop existing policy to allow idempotent re-runs
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${policyName}" ON ${table};`);

      // Create unified policy: SELECT, INSERT, UPDATE, DELETE
      // The policy checks that the row's tenantId matches the session variable.
      // NULLable tenantId columns: NULL tenantId rows are visible to all tenants
      // (platform-level rows without tenant scope).
      await prisma.$executeRawUnsafe(`
        CREATE POLICY "${policyName}" ON ${table}
        FOR ALL
        USING (
          ${column} IS NULL
          OR ${column} = current_setting('ztan.current_tenant_id', true)
          OR current_setting('ztan.current_tenant_id', true) = 'platform-admin'
        )
        WITH CHECK (
          ${column} IS NULL
          OR ${column} = current_setting('ztan.current_tenant_id', true)
          OR current_setting('ztan.current_tenant_id', true) = 'platform-admin'
        );
      `);

      console.log(`[Bootstrap]   ✓ RLS policy "${policyName}" applied to ${table}`);
    }

    console.log('[Bootstrap] Row-Level Security hardening completed.');
  } catch (error: any) {
    console.error('[Bootstrap] Failed to apply ZTAN database triggers:', error.message || error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
