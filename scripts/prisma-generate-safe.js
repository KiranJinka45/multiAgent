const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = 'packages/db/prisma/schema.prisma';
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const skipIfExists = process.argv.includes('--skip-if-exists');
  const prismaDir = path.join(process.cwd(), 'node_modules', '.prisma');
  
  if (skipIfExists && fs.existsSync(prismaDir)) {
    console.log('⏩ Prisma client already exists and --skip-if-exists is set. Skipping generation.');
    return;
  }

  console.log('🚀 Starting safe Prisma generation...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`[Attempt ${i + 1}/${MAX_RETRIES}] Running prisma generate...`);
      
      // On Windows, we check if the node_modules/.prisma exists and try to delete it first 
      // if it's not locked.
      const prismaDir = path.join(process.cwd(), 'node_modules', '.prisma');
      if (fs.existsSync(prismaDir)) {
          try {
              // Non-recursive deletion of files first to check for locks
              fs.readdirSync(prismaDir).forEach(file => {
                  fs.unlinkSync(path.join(prismaDir, file));
              });
          } catch (e) {
              if (e.code === 'EPERM' || e.code === 'EBUSY') {
                  console.warn('⚠️ Found locked Prisma files. Retrying after delay...');
                  await sleep(RETRY_DELAY);
                  continue;
              }
          }
      }

      execSync(`npx prisma generate --schema=${SCHEMA_PATH}`, { stdio: 'inherit' });
      console.log('✅ Prisma generation successful.');
      return;
    } catch (err) {
      if (i === MAX_RETRIES - 1) {
        console.error('❌ Failed to generate Prisma client after multiple retries.');
        process.exit(1);
      }
      console.warn(`⚠️ Prisma generate failed: ${err.message}. Retrying...`);
      await sleep(RETRY_DELAY);
    }
  }
}

run();
