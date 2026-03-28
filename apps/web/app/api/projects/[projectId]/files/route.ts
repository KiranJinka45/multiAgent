import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '@packages/utils/server';

interface FileTreeEntry {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeEntry[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);

  try {
    if (!await fs.pathExists(sandboxDir)) {
      return NextResponse.json({ 
        projectId,
        files: [],
        message: 'Sandbox not found'
      }, { status: 200 });
    }

    const buildTree = async (currentPath: string, relativePath: string = ''): Promise<FileTreeEntry[]> => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      const tree: FileTreeEntry[] = [];

      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue;

        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.join(relativePath, entry.name).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          tree.push({
            name: entry.name,
            path: relPath,
            type: 'folder',
            children: await buildTree(fullPath, relPath)
          });
        } else {
          tree.push({
            name: entry.name,
            path: relPath,
            type: 'file'
          });
        }
      }

      // Sort: folders first, then alphabetical
      return tree.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    };

    const files = await buildTree(sandboxDir);
    return NextResponse.json({ projectId, files });

  } catch (error) {
    logger.error({ projectId, error }, '[FileTreeAPI] Failed to read sandbox file tree');
    return NextResponse.json({ error: 'Failed to read file tree' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
