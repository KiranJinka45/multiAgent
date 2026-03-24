'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { projectService } from '@libs/utils';
import { toast } from 'sonner';

function RemixContent({ params }: { params: { id: string } }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode');
    const previewId = params.id;

    useEffect(() => {
        const performRemix = async () => {
            const toastId = toast.loading("Analyzing Sandbox for Remix...");
            
            try {
                // 1. Fetch source project info
                const res = await fetch(`/api/registry/lookup?previewId=${previewId}`);
                if (!res.ok) throw new Error("Sandbox not found");
                const reg = await res.json();
                
                const sourceProject = await projectService.getProject(reg.projectId);
                if (!sourceProject) throw new Error("Source project record not found");

                if (mode === 'prompt') {
                    // Redirect to home with pre-filled prompt
                    router.push(`/?prompt=${encodeURIComponent(sourceProject.description || '')}&remixSource=${previewId}`);
                    toast.success("Prompt imported! Ready to remix.", { id: toastId });
                } else {
                    // Full Remix: Create a NEW project with same name + " (Remix)"
                    const { data: newProject, error } = await projectService.createProject(
                        `${sourceProject.name} (Remix)`,
                        sourceProject.description,
                        sourceProject.project_type
                    );

                    if (error || !newProject) throw new Error("Failed to create remix project");

                    // Clone files (optional focus for MVP, but we'll redirect to build)
                    router.push(`/projects/${newProject.id}`);
                    toast.success("Project cloned! You are in your own sandbox now.", { id: toastId });
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Remix failed";
                toast.error(message, { id: toastId });
                router.push('/');
            }
        };

        performRemix();
    }, [previewId, mode, router]);

    return (
        <div className="h-screen w-full bg-black flex items-center justify-center">
            <div className="flex flex-col items-center gap-8 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin relative z-10" />
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">
                        Preparing Remix
                    </span>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                        Creating your personal sandbox...
                    </h2>
                </div>
            </div>
        </div>
    );
}

export default function RemixPage({ params }: { params: { id: string } }) {
    return (
        <Suspense fallback={
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        }>
            <RemixContent params={params} />
        </Suspense>
    );
}
