import { bootstrapZtanSecurity } from './bootstrap.js';

async function main() {
  console.log('[Runner] Starting ZTAN Consensus Security Setup...');
  try {
    await bootstrapZtanSecurity();
    console.log('[Runner] Database triggers successfully bootstrapped!');
    process.exit(0);
  } catch (error) {
    console.error('[Runner] Error running bootstrap:', error);
    process.exit(1);
  }
}

main();
