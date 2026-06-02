// Temporal Activities for Resilience testing

export async function writeBlockActivity(payload: string): Promise<string> {
  const { db } = await import('../packages/db/src/index.js');
  const blockId = `resilience-block-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    console.log(`  [Activity] Attempting write to database for: ${payload}`);
    
    const block = await db.ztanLedgerBlock.create({
      data: {
        blockId,
        prevHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        hash: '0xdummyhash',
        type: 'RESILIENCE_TEST',
        payload,
        operator: 'steward_omega',
        signature: 'sig',
        status: 'VERIFIED',
        epoch: '1'
      }
    });

    console.log(`  [Activity] Write succeeded! Created block: ${block.blockId}`);
    return block.blockId;
  } catch (err: any) {
    console.error(`  [Activity] Write failed with error: ${err.message}`);
    throw err; // Rethrow to trigger Temporal retry mechanism
  }
}
