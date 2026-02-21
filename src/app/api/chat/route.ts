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

export const runtime = 'edge';

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

        const selectedModel = modelMap[model as string] || 'llama-3.1-8b-instant';

        let systemPrompt = `You are MultiAgent, a world-class system architect and software engineer inspired by platforms like Lovable, Bolt, and Replit.
Your primary goal is to help users build end-to-end projects, websites, and applications in minutes.

RULES:
1. **No-Code/High-Speed Mindset**: Proactively suggest and use rapid development tools (Tailwind CSS, Framer Motion, Lucide React).
2. **Rapid Backend**: For logic and data, always favor Supabase, Edge Functions, or serverless patterns that integrate instantly.
3. **Professional Grade**: Build functional, high-fidelity code over long explanations.
4. **Architectural Excellence**: When a user wants to build something, think about the full structure first, then implement. Use professional boilerplates.
5. **Aesthetics Matter**: Always use modern, premium UI/UX patterns (glassmorphism, vibrant gradients, smooth animations).

You are the Project Creator and Lead Architect. Build it right, build it fast.

SPECIAL DIRECTIVE:
If the user's message indicates they want to BUILD a website, landing page, or application, append the hidden tag [SITE_BUILD_REQUEST] at the very END of your response. This will trigger our specialized builder UI.`;

        if (model === 'Thinking') {
            systemPrompt += ' Please provide a deep architectural analysis and step-by-step implementation plan. Think through edge cases and deployment strategies thoroughly.';
        } else if (model === 'Pro') {
            systemPrompt += ' You are in Pro mode. Provide advanced full-stack reasoning, enterprise-grade architecture patterns, and expert-level optimization insights.';
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
