const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const skipIfExists = args.includes('--skip-if-exists');

if (skipIfExists) {
  // Check if prisma client exists in the usual locations
  const clientPath = path.join(__dirname, '../node_modules/.prisma/client');
  if (fs.existsSync(clientPath)) {
    console.log('Prisma client already exists, skipping generation.');
    process.exit(0);
  }
}

try {
  console.log('Generating Prisma client...');
  execSync('npx prisma generate --schema=packages/db/prisma/schema.prisma', { stdio: 'inherit' });
  console.log('Prisma client generated successfully.');
} catch (error) {
  console.error('Failed to generate Prisma client:', error.message);
  // We don't exit with error here to avoid blocking pnpm install in environments where prisma might not be ready
  process.exit(0);
}
