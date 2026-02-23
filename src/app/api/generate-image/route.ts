import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Using Pollinations AI as a free, high-speed prototype for "Create images"
        // It provides direct image URLs for prompts
        const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;

        // We'll return a message-like response that the frontend can handle
        return NextResponse.json({
            response: `![Generated Image for: ${prompt}](${imageUrl})\n\nI've generated this image based on your request: "${prompt}"`,
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error('Image Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }
}
