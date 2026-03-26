import { NextRequest, NextResponse } from 'next/server';
import { Planner } from '@libs/brain';
import { chatService } from '@libs/utils/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, projectId, fileName, content } = await req.json();

    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    const planner = new Planner(process.env.OPENAI_API_KEY || '');
    
    // Use the Brain Planner to decompose the edit request
    const tasks = await planner.plan(`Edit file ${fileName} in project ${projectId}: ${prompt}`);

    console.log(`🤖 [AI-Edit] Planned ${tasks.length} subtasks for edit.`);

    // For Phase 1, we simulate the edit response by calling the LLM directly 
    // to provide the new file content.
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert developer. Modify the following code based on the user request. 
            Return ONLY the full updated code. No markdown, no explanations.`
          },
          {
            role: 'user',
            content: `Original Code:\n${content}\n\nRequest: ${prompt}`
          }
        ]
      })
    });

    const data = await response.json();
    const newContent = data.choices[0].message.content;

    // Save the edit to the project history if needed
    // await chatService.addMessage(projectId, `AI Refactor: ${prompt}`, 'assistant');

    return NextResponse.json({ success: true, newContent, tasks });
  } catch (error: any) {
    console.error('[AI-Edit] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
