import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@packages/supabase';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Using Pollinations AI as a free, high-speed prototype for "Create images"
        // It provides direct image URLs for prompts
        const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;

        // Save to Supabase
        const { data, error } = await supabase
            .from('generated_images')
            .insert([{
                user_id: session.user.id,
                prompt,
                url: imageUrl,
                model: 'pollinations'
            }])
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            // Non-fatal, still return image even if save fails for preview
        }

        // We'll return a message-like response that the frontend can handle
        return NextResponse.json({
            response: `![Generated Image for: ${prompt}](${imageUrl})\n\nI've generated this image based on your request: "${prompt}"`,
            imageUrl: imageUrl,
            dbRecord: data
        });
    } catch (error) {
        console.error('Image Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }
}
