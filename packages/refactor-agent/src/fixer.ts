import fs from 'fs-extra';
import path from 'path';

export const RELATIVE_IMPORT_REGEX = /from ['"](\.\.\/)+([^'"]+)['"]/g;

export async function applyFixes(filePath: string) {
  let content = await fs.readFile(filePath, 'utf-8');
  let originalContent = content;

  // 1. Generic relative to @libs/ fix
  // This helps enforce the '@libs' namespace convention
  content = content.replace(RELATIVE_IMPORT_REGEX, (match, dots, rawPath) => {
    // 1. If it's a known legacy redirect
    if (rawPath.includes('shared/logger')) return "from '@libs/observability'";
    if (rawPath.includes('lib/queue/agent-queues')) return "from '@libs/utils'";
    if (rawPath.includes('lib/supabase')) return "from '@libs/supabase'";
    
    // 2. Default to @libs/ mapping but clean up common mid-segments
    const cleanPath = rawPath.replace(/^(lib|src)\//, '');
    return `from '@libs/${cleanPath}'`;
  });

  if (content !== originalContent) {
    await fs.writeFile(filePath, content);
    return true;
  }
  return false;
}
