import { PreviewRegistry } from '@libs/registry';
import { previewManager } from '@runtime/preview-manager';
import { AnalyticsService } from '@libs/utils';
import { GrowthHeader } from '@/components/GrowthHeader';
import { RemixWatermark } from '@/components/editor/RemixWatermark';
import { projectService } from '@libs/utils';
import { Loader2 } from 'lucide-react';
import { headers } from 'next/headers';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const reg = await PreviewRegistry.lookupByPreviewId(params.id);
    if (!reg) return { title: 'MultiAgent | Autonomous AI IDE' };

    const project = await projectService.getProject(reg.projectId);
    const title = project?.name || 'Shared Mission';
    const description = project?.description || 'Built with MultiAgent in under 120 seconds.';

    return {
        title: `${title} | Built with MultiAgent`,
        description,
        openGraph: {
            title: `${title} | Built with MultiAgent`,
            description,
            images: ['/og-preview-default.png'], // Assuming a default OG image exists or will be generated
        },
        twitter: {
            card: 'summary_large_image',
            title: `${title} | Built with MultiAgent`,
            description,
        }
    };
}

export default async function SharePage({ params }: { params: { id: string } }) {
    const previewId = params.id;
    const headerList = headers();
    const referrer = headerList.get('referer') || undefined;

    let reg = await PreviewRegistry.lookupByPreviewId(previewId);
    if (!reg) {
        reg = await PreviewRegistry.get(previewId);
    }

    if (!reg) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-white p-6">
                <div className="text-center space-y-6 max-w-sm">
                    <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
                        <span className="text-4xl font-black text-red-500">!</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Sandbox Lost</h1>
                        <p className="text-neutral-500 text-sm leading-relaxed">
                            This autonomous sandbox may have expired or been deleted. 
                            Build your own in seconds with MultiAgent.
                        </p>
                    </div>
                    <a 
                        href="/"
                        className="inline-block px-8 py-3 bg-white text-black font-bold rounded-2xl hover:bg-neutral-200 transition-colors"
                    >
                        Build Now
                    </a>
                </div>
            </div>
        );
    }

    // Fetch project details for growth prompts
    const project = await projectService.getProject(reg.projectId);

    // Track viral hit (non-blocking)
    AnalyticsService.trackShareView(previewId, referrer).catch(() => {});

    const isRunning = reg.status === 'RUNNING';
    
    // Auto-wake if not running (Drives retention during viral hits)
    if (!isRunning) {
        previewManager.restartPreview(reg.projectId).catch(() => {});
    }

    const previewUrl = isRunning 
        ? `/preview/${previewId}${reg.accessToken ? `?token=${reg.accessToken}` : ''}`
        : null;

    return (
        <div className="fixed inset-0 bg-[#050505] overflow-hidden selection:bg-blue-500/30">
            {!isRunning ? (
                <div className="flex flex-col items-center justify-center h-full gap-10 animate-in fade-in zoom-in duration-1000 px-6">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-600/30 blur-[100px] rounded-full group-hover:bg-blue-600/50 transition-colors" />
                        <div className="w-24 h-24 rounded-[2.5rem] bg-neutral-900 border border-white/10 flex items-center justify-center relative z-10 animate-pulse overflow-hidden">
                            <Loader2 size={40} className="text-blue-500 animate-spin" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent pointer-events-none" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">
                                Global Registry
                            </span>
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter sm:text-4xl">
                            Waking up Sandbox<span className="text-blue-500">.</span>
                        </h2>
                        <p className="text-neutral-500 text-sm max-w-[280px] leading-relaxed">
                            Bringing the autonomous environment online. This page will refresh automatically.
                        </p>
                    </div>
                    
                    {/* Auto-refresh logic (Meta tag for simple landing pages) */}
                    <meta httpEquiv="refresh" content="4" />
                </div>
            ) : (
                <div className="h-full pt-[72px] relative flex flex-col">
                    <GrowthHeader 
                        previewId={previewId} 
                        projectName={project?.name}
                        prompt={project?.description} 
                    />
                    <div className="flex-1 w-full bg-white relative rounded-t-[2.5rem] overflow-hidden shadow-2xl border-t border-white/5">
                        <iframe 
                            src={previewUrl!} 
                            className="w-full h-full border-none opacity-0 animate-in fade-in fill-mode-forwards duration-1000 delay-300"
                            title="Built with MultiAgent"
                        />
                        <RemixWatermark />
                    </div>
                </div>
            )}
        </div>
    );
}
