import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { code, language, fileName } = await req.json();

    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

    // In a real production environment, this would call a remote sandbox service 
    // or run in a hardened Firecracker VM / Docker container.
    // For this local platform demonstration, we run it in a temp isolated dir.

    const tempDir = path.join(process.cwd(), '.temp_sandbox', crypto.randomUUID());
    fs.mkdirSync(tempDir, { recursive: true });

    const safeFileName = fileName || `index.${language === 'typescript' ? 'ts' : 'js'}`;
    const filePath = path.join(tempDir, safeFileName);
    fs.writeFileSync(filePath, code);

    let output = '';
    let error = '';

    try {
      if (language === 'typescript' || safeFileName.endsWith('.ts')) {
        output = execSync(`npx tsx ${filePath}`, { encoding: 'utf8', timeout: 5000 });
      } else {
        output = execSync(`node ${filePath}`, { encoding: 'utf8', timeout: 5000 });
      }
    } catch (err: any) {
      error = err.stderr || err.message;
    } finally {
      // Cleanup
      // fs.rmSync(tempDir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: !error, output, error });
  } catch (error: any) {
    console.error('[Sandbox-Run] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
