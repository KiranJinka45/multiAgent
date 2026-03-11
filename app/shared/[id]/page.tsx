import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

export default async function PublicProjectPage({ params }: { params: { id: string } }) {
    // We use a separate client or a service role if we want it truly public
    // For now, let's keep it restricted to authenticated or implement a "is_public" check later
    const supabase = createServerComponentClient({ cookies });

    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single();

    if (!project) notFound();

    const { data: files } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', params.id);

    const htmlFile = files?.find(f => f.path.endsWith('.html'));
    const cssFiles = files?.filter(f => f.path.endsWith('.css')) || [];
    const jsFiles = files?.filter(f => f.path.endsWith('.js')) || [];

    if (!htmlFile) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-900 text-gray-400 font-sans">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-white">404</h1>
                    <p>No entry point found for this project.</p>
                </div>
            </div>
        );
    }

    // Construct the full document
    const css = cssFiles.map(f => `<style>${f.content}</style>`).join('\n');
    const js = jsFiles.map(f => `<script>${f.content}</script>`).join('\n');

    const fullDoc = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${project.name}</title>
            <meta name="description" content="${project.description || ''}">
            ${css}
        </head>
        <body>
            ${htmlFile.content}
            ${js}
        </body>
        </html>
    `;

    return (
        <div className="w-full h-full min-h-screen bg-white">
            <iframe
                srcDoc={fullDoc}
                className="w-full h-screen border-none"
                title={project.name}
            />
        </div>
    );
}
