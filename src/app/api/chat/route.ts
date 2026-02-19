import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { message, model } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const modelMap: Record<string, string> = {
            'Fast': 'llama-3.1-8b-instant',
            'Thinking': 'llama-3.3-70b-versatile',
            'Pro': 'llama-3.3-70b-versatile'
        };

        const selectedModel = modelMap[model as string] || 'llama-3.3-70b-versatile';

        let systemPrompt = 'You are MultiAgent, a helpful and intelligent AI assistant. You provide concise, accurate, and well-formatted responses. Use markdown for code and structured data.';

        if (model === 'Thinking') {
            systemPrompt += ' Please provide a detailed, step-by-step analysis. Think through the problem thoroughly before giving the final answer.';
        } else if (model === 'Pro') {
            systemPrompt += ' You are in Pro mode. Provide advanced reasoning, comprehensive answers, and expert-level insights.';
        }

        const stream = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: message,
                },
            ],
            model: selectedModel,
            stream: true,
        });

        // Create a ReadableStream from the Groq stream
        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        controller.enqueue(encoder.encode(content));
                    }
                }
                controller.close();
            },
        });

        return new Response(customStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });
    } catch (error: any) {
        console.error('Groq API Error:', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        return NextResponse.json({ error: `Groq/AI Error: ${errorMessage}` }, { status: 500 });
    }
}
