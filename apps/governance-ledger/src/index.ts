import { startServer } from './server.js';

startServer().catch(err => {
    console.error('Failed to start Governance Ledger:', err);
    process.exit(1);
});
