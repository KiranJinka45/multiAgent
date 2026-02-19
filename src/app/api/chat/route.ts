import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

// Initialize Groq inside the handler or with a check to avoid top-level crashes if API key is missing
const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured in environment variables');
    }
    return new Groq({ apiKey });
};

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { message, model } = body;

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

        const groq = getGroqClient();
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
                try {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(encoder.encode(content));
                        }
                    }
                } catch (err) {
                    console.error('Error during streaming:', err);
                    controller.error(err);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(customStream, {
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('Chat API Error:', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error';

        // Return a clean JSON error for non-streaming failures
        return NextResponse.json(
            { error: `MultiAgent Error: ${errorMessage}` },
            { status: error?.status || 500 }
        );
    }
}
