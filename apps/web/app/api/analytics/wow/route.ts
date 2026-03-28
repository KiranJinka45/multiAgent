import { NextResponse } from 'next/server';
import axios from 'axios';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Proxy to the API gateway which handles Redis/AnalyticsService
    await axios.post(`${GATEWAY_URL}/analytics/wow`, { projectId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Analytics WOW] Error proxying request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
