// Bootstrap: must set env vars before any module with side-effects is loaded
process.env.MOCK_DB = 'true';
process.env.MOCK_REDIS = 'true';
process.env.GOVERNANCE_LEDGER_URL = 'http://localhost:3105';

// Now dynamically import the test — this ensures env vars exist before any
// module-level initialization code runs inside @packages/db, @packages/config etc.
const { run } = await import('./test-runtime-attestation-impl.js');
await run();
