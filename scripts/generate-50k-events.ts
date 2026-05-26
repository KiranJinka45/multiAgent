import { io } from 'socket.io-client';
import chalk from 'chalk';

console.log(chalk.bold.magenta('\n╔══════════════════════════════════════════════════════════╗'));
console.log(chalk.bold.magenta('║             ZTAN ADVANCED STRESS DRILL GENERATOR         ║'));
console.log(chalk.bold.magenta('║        - Byzantine Telemetry anomaly Ingestion Flooder - ║'));
console.log(chalk.bold.magenta('╚══════════════════════════════════════════════════════════╝\n'));

// Parse command-line args for Byzantine types
let byzantineType: string | undefined = undefined;
if (process.argv.includes('--byzantine-skew')) byzantineType = 'skew';
else if (process.argv.includes('--byzantine-collision')) byzantineType = 'collision';
else if (process.argv.includes('--byzantine-hash')) byzantineType = 'hash_mismatch';
else if (process.argv.includes('--byzantine-gaps')) byzantineType = 'gaps';

if (byzantineType) {
  console.log(chalk.cyan(`⚠️  Byzantine anomaly injection active: ${byzantineType.toUpperCase()}\n`));
}

const socket = io('http://localhost:3500', {
  transports: ['websocket'],
  reconnection: false
});

socket.on('connect', () => {
  console.log(chalk.green('✔ Connected to API Gateway at http://localhost:3500'));
  console.log(chalk.yellow('⚡ Triggering 50k synthetic Merkle forensic stream via Gateway...'));
  
  socket.emit('sre:archaeology:stress_pump', { count: 50000, byzantineType });
});

socket.on('disconnect', () => {
  console.log(chalk.red('❌ Disconnected from API Gateway'));
  process.exit(0);
});

socket.on('sre:error', (err) => {
  console.error(chalk.red('🚨 Socket error:', err));
  process.exit(1);
});

// Let the socket stream all batches to the gateway and connected clients,
// then close after 12 seconds
setTimeout(() => {
  console.log(chalk.green('✔ Stress drill generator completed execution cycle. Exiting.'));
  socket.close();
  process.exit(0);
}, 12000);
