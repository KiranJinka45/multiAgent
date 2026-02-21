import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Sidebar from '@/components/Sidebar';
import ProjectGallery from '@/components/ProjectGallery';
import { projectService } from '@/lib/project-service';

export default async function ProjectsPage() {
    const supabase = createServerComponentClient({ cookies });
    const projects = await projectService.getProjects(supabase);

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
