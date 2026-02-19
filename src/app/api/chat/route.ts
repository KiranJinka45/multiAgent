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

        // Map UI model names to Groq model IDs
        // Map UI model names to Groq model IDs
        const modelMap: Record<string, string> = {
            'Fast': 'llama-3.1-8b-instant',
            'Thinking': 'llama-3.3-70b-versatile',
            'Pro': 'llama-3.3-70b-versatile'
        };

        const selectedModel = modelMap[model as string] || 'llama-3.3-70b-versatile';

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are MultiAgent, a helpful and intelligent AI assistant. You provide concise, accurate, and well-formatted responses. Use markdown for code and structered data.'
                },
                {
                    role: 'user',
                    content: message,
                },
            ],
            model: selectedModel,
        });

        const responseContent = completion.choices[0]?.message?.content || 'No response generated.';

        return NextResponse.json({ response: responseContent });
    } catch (error: any) {
        console.error('Groq API Error:', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        return NextResponse.json({ error: `Groq/AI Error: ${errorMessage}` }, { status: 500 });
    }
}
