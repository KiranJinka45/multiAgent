import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buildId = searchParams.get('buildId');

  if (!buildId) {
    return NextResponse.json({ error: 'buildId is required' }, { status: 400 });
  }

  // Simulations
  const steps = ['planning', 'generating', 'fixing', 'deploying', 'complete'];
  
  // Use the build ID's suffix to determine a "start time" for the simulation
  // This allows us to have a stateless simulation that still progresses
  const timestamp = Date.now();
  const startTime = parseInt(buildId.split('_')[1], 36) || 0; 
  const elapsed = (timestamp - startTime) % 60000; // Reset every 60s for demo
  
  let currentIndex = Math.min(Math.floor(elapsed / 10000), steps.length - 1);
  const status = steps[currentIndex];
  
  const previewUrl = status === 'complete' ? 'https://demo-preview.multiagent.app' : null;

  return NextResponse.json({
    status,
    previewUrl,
  });
}
