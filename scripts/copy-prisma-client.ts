import fs from 'fs-extra';
import path from 'path';

const dbDir = path.join(process.cwd(), 'packages', 'db');
const srcGenerated = path.join(dbDir, 'src', 'generated');
const distGenerated = path.join(dbDir, 'dist', 'generated');

async function copy() {
  if (fs.existsSync(srcGenerated)) {
    console.log(`Copying Prisma client from ${srcGenerated} to ${distGenerated}...`);
    await fs.ensureDir(distGenerated);
    await fs.copy(srcGenerated, distGenerated);
    console.log('✅ Prisma client copied successfully.');
  } else {
    console.warn('⚠️  Source generated directory not found. Skipping copy.');
  }
}

copy().catch(console.error);
