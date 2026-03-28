import fs from 'fs-extra';
import path from 'path';
import { logger } from '@packages/utils';

export async function createFile(filePath: string, content: string) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  
  logger.info({ path: absolutePath }, 'Creating file...');
  await fs.ensureDir(path.dirname(absolutePath));
  await fs.writeFile(absolutePath, content);
}
