CREATE TABLE "ZtanActiveLease" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "ownerHost" TEXT NOT NULL,
    "ownerPid" INTEGER NOT NULL,
    "generation" INTEGER NOT NULL,
    "heartbeat" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "ZtanLedgerBlock" (sequence_id, payload, generation)
SELECT $1, $2, $3
WHERE NOT EXISTS (
    SELECT 1 FROM "ZtanActiveLease" 
    WHERE partition = $4 AND generation > $3
);
WHERE NOT EXISTS (
    SELECT 1 FROM "ZtanActiveLease" 
    WHERE partition = $partition AND generation > $current_generation
);
