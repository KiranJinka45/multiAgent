import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import JSZip from 'jszip';
import logger from '@libs/utils';

export async function GET(
    _request: NextRequest,
    { params }: { params: { projectId: string } }
) {
    const { projectId } = params;
    const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);

    if (!await fs.pathExists(sandboxDir)) {
        return NextResponse.json({ error: 'Project sandbox not found or not yet generated.' }, { status: 404 });
    }

    try {
    const zip = new JSZip();
    await addDirectoryToZip(sandboxDir, sandboxDir, zip);

    const content = await zip.generateAsync({ type: 'uint8array' });

    return new NextResponse(content as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${projectId}.zip"`,
      },
    });
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to export project');
    return NextResponse.json({ error: 'Failed to generate project export.' }, { status: 500 });
  }
}

async function addDirectoryToZip(rootPath: string, currentPath: string, zip: JSZip) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);

    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
      continue;
    }

    if (entry.isDirectory()) {
      await addDirectoryToZip(rootPath, fullPath, zip);
    } else {
      const fileContent = await fs.readFile(fullPath);
      zip.file(relativePath, fileContent);
    }
  }
}
