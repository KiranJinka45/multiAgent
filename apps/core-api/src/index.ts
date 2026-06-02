// Entry point for @apps/api

// Attach early global handler to satisfy ZTAN StartupAttestation requirements
process.on('uncaughtException', (err) => {
    console.error('Early Uncaught Exception:', err);
});

import './services/socket.js';
