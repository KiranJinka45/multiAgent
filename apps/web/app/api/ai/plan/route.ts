import { NextRequest, NextResponse } from 'next/server';
import { Planner } from '@libs/brain';

export async function POST(req: NextRequest) {
  try {
    const { objective } = await req.json();

    if (!objective) return NextResponse.json({ error: 'Objective is required' }, { status: 400 });

    const planner = new Planner(process.env.OPENAI_API_KEY || '');
    const tasks = await planner.plan(objective);

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error('[AI-Plan] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
