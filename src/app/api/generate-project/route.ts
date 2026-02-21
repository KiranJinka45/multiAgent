import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not configured');
    return new Groq({ apiKey });
};

export const runtime = 'edge';

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        const { projectId, prompt } = await req.json();
        console.log(`[Generate API] Request received for project: ${projectId}`);
        console.log(`[Generate API] Prompt: ${prompt.substring(0, 50)}...`);

        if (!projectId || !prompt) {
            return NextResponse.json({ error: 'Project ID and prompt are required' }, { status: 400 });
        }

        console.log(`[Generate API] Env check: GROQ_KEY=${!!process.env.GROQ_API_KEY}, SUPABASE_URL=${!!process.env.NEXT_PUBLIC_SUPABASE_URL}, SERVICE_ROLE=${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);

        const groq = getGroqClient();

        // 1. Cascading Architecture Design
        console.log(`[Generate API] Starting Cascading Architecture Design (8b-instant)...`);

        const architectStream = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are a World-Class Architect. Design a project structure.
                    
                    TRIAGE RULE: 
                    1. Detect if the goal is a "Simple Landing Page", "One-Pager", or "Single Feature app".
                    2. For simple goals, use SUPER-LEAN MODE: MANDATE exactly ONE professional "index.html" using Tailwind CDN. NO other files.
                    3. For complex goals, use a professional modular structure (max 5 files).
                    
                    Switch to ultra-concise mode.
                    Respond ONLY with a JSON array of files: [{"path": "...", "description": "..."}]`
                },
                {
                    role: 'user',
                    content: `Project: ${prompt}`
                }
            ],
            model: 'llama-3.1-8b-instant',
            stream: true,
        });

        const fileGenerationPromises: Promise<any>[] = [];
        const processedFiles = new Set<string>();
        let accumulatedJson = '';

        // Update project status to bootstrapping
        await supabase.from('projects').update({ status: 'generating' }).eq('id', projectId);

        for await (const chunk of architectStream) {
            const content = chunk.choices[0]?.delta?.content || '';
            accumulatedJson += content;

            // Simple partial JSON parser using regex to find objects in the array
            // Matches: {"path": "...", "description": "..."}
            const fileMatchRegex = /\{\s*"path":\s*"([^"]+)",\s*"description":\s*"([^"]+)"\s*\}/g;
            let match;

            while ((match = fileMatchRegex.exec(accumulatedJson)) !== null) {
                const filePath = match[1];
                const fileDesc = match[2];

                if (!processedFiles.has(filePath)) {
                    processedFiles.add(filePath);
                    console.log(`[Generate API] Cascading trigger for: ${filePath}`);

                    // Immediately trigger content generation for this file
                    const genPromise = (async () => {
                        try {
                            const contentResponse = await groq.chat.completions.create({
                                messages: [
                                    {
                                        role: 'system',
                                        content: `Expert Developer. Generate world-class code for "${filePath}". 
                                        Standard: Tailwind CDN, Framer Motion CDN, Google Fonts, Lucide Icons (CDN). 
                                        If it's an "index.html" for a landing page, include ALL sections, styles, and scripts in this one file for maximum deployment speed.
                                        Raw code only.`
                                    },
                                    {
                                        role: 'user',
                                        content: `Context: ${prompt}\nFile Role: ${fileDesc}`
                                    }
                                ],
                                model: 'llama-3.3-70b-versatile'
                            });

                            const code = contentResponse.choices[0].message.content;

                            await supabase.from('project_files').upsert({
                                project_id: projectId,
                                path: filePath,
                                content: code,
                                language: filePath.split('.').pop() || 'text'
                            }, { onConflict: 'project_id,path' });

                            console.log(`[Generate API] Cascaded build finished: ${filePath}`);
                        } catch (err) {
                            console.error(`[Generate API] Cascaded build failed for ${filePath}:`, err);
                        }
                    })();

                    fileGenerationPromises.push(genPromise);
                }
            }
        }

        console.log(`[Generate API] Architect stream finished. Waiting for ${fileGenerationPromises.length} cascaded builds...`);
        await Promise.all(fileGenerationPromises);

        // Finalize
        const { error: finalError } = await supabase.from('projects').update({
            status: 'completed',
            description: prompt
        }).eq('id', projectId);

        if (finalError) throw finalError;

        console.log(`[Generate API] Success! Cascading build complete for ${projectId}.`);
        return NextResponse.json({ success: true, filesCount: processedFiles.size });

    } catch (error: any) {
        console.error('[Generate API] Fatal Error:', error);
        return NextResponse.json({
            error: error.message || 'Unknown error',
            details: error.response?.data || error.stack || null,
            fullError: JSON.stringify(error)
        }, { status: 500 });
    }
}
