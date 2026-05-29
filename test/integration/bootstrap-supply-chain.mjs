// Bootstrap Stage 9: set environment variables before dynamic import
process.env.MOCK_DB = 'true';
process.env.MOCK_REDIS = 'true';
process.env.GOVERNANCE_LEDGER_URL = 'http://localhost:3105';

// Dynamically import the test file to avoid hoisting issues with static imports
const { run } = await import('./test-supply-chain-replay.js');
await run();
