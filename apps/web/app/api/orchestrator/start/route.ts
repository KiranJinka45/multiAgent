import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    
    // Simulate build ID generation
    const buildId = `mission_${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real implementation, this would trigger a Temporal workflow or a BullMQ task
    console.log(`[Orchestrator Proxy] Starting build for: ${prompt} (ID: ${buildId})`);
    
    return NextResponse.json({ buildId });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to start build' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
