import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Sidebar from '@components/Sidebar';
import ProjectGallery from '@components/ProjectGallery';
import { projectService } from '@services/project-service';

export default async function ProjectsPage() {
    let projects = null;
    try {
        const supabase = createServerComponentClient({ cookies });
        projects = await projectService.getProjects(supabase);
    } catch (err) {
        // Supabase unreachable (network issue / env not configured) — render empty gallery
        console.error('[ProjectsPage] Failed to fetch projects:', err);
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <Sidebar />
            <main
                className="flex-1 flex flex-col h-full relative transition-[margin] duration-300 ease-in-out"
                style={{ marginLeft: 'var(--sidebar-width, 260px)' }}
            >
                <ProjectGallery initialProjects={projects || []} />
            </main>
        </div>
    );
}
