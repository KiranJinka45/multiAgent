import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not configured');
    return new Groq({ apiKey });
};

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { fileId, projectId, currentContent, prompt, filePath } = await req.json();

        if (!fileId || !prompt || !currentContent) {
            return NextResponse.json({ error: 'File ID, content, and prompt are required' }, { status: 400 });
        }

        console.log(`[Refine API] Modifying file: ${filePath} (${fileId})`);
        const groq = getGroqClient();

        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an Expert Senior Developer. Your task is to MODIFY the provided code according to the user's request.
                    
                    RULES:
                    - Respond ONLY with the updated raw code.
                    - DO NOT include markdown code blocks (e.g., no \`\`\`html).
                    - DO NOT include explanations, notes, or commentary.
                    - Maintain the existing style and architecture of the file.
                    - Ensure the output is high-quality, professional, and production-ready.
                    
                    Target File: ${filePath}`
                },
                {
                    role: 'user',
                    content: `Current Content:\n${currentContent}\n\nModification Request: ${prompt}`
                }
            ],
            model: 'llama-3.3-70b-versatile'
        });

        const updatedContent = response.choices[0].message.content;

        if (!updatedContent) {
            throw new Error('AI failed to generate updated content');
        }

        // Save updated content to DB
        const { data, error } = await supabase
            .from('project_files')
            .update({
                content: updatedContent,
                updated_at: new Date().toISOString()
            })
            .eq('id', fileId)
            .select()
            .single();

        if (error) {
            console.error('[Refine API] Supabase Update Error:', error);
            throw new Error(`Failed to save changes: ${error.message}`);
        }

        console.log(`[Refine API] Success! File ${filePath} updated.`);
        return NextResponse.json({ success: true, updatedFile: data });

    } catch (error: any) {
        console.error('[Refine API] Fatal Error:', error);
        return NextResponse.json({
            error: error.message || 'Unknown error',
            details: error.stack || null
        }, { status: 500 });
    }
}
