import { NextRequest } from 'next/server';
import { PreviewRegistry } from '@registry/previewRegistry';
import { previewManager } from '@runtime/preview-manager';
import { AnalyticsService } from '@/services/analytics-service';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const previewId = params.id;
    const referrer = req.headers.get('referer') || undefined;

    try {
        let reg = await PreviewRegistry.lookupByPreviewId(previewId);
        if (!reg) {
            // Fallback for direct projectId lookups if used for testing
            reg = await PreviewRegistry.get(previewId);
        }

        if (!reg) {
            return new Response('Preview Not Found', { status: 404 });
        }

        // 1. Track Analytics (Viral Growth metric)
        await AnalyticsService.trackShareView(previewId, referrer);

        // 2. Auto-wake if not running (Drives retention)
        if (reg.status !== 'RUNNING') {
            // Using non-blocking restart to show the "activating" state in UI
            previewManager.restartPreview(reg.projectId).catch(() => {});
        }

        const previewUrl = `/preview/${previewId}${reg.accessToken ? `?token=${reg.accessToken}` : ''}`;

        // Return a beautiful Viral Landing Page
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Built with MultiAgent | ${previewId}</title>
                
                <!-- Viral Metadata -->
                <meta property="og:title" content="Check out this AI-generated app!">
                <meta property="og:description" content="Built instantly using MultiAgent Autonomous Development Platform.">
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="Autonomous Build: ${previewId}">
                
                <style>
                    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #050505; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                    iframe { width: 100%; height: 100%; border: none; background: transparent; }
                    
                    .viral-overlay {
                        position: fixed; bottom: 16px; right: 16px; z-index: 1000;
                        display: flex; align-items: center; gap: 8px; padding: 8px 12px;
                        background: rgba(15, 15, 15, 0.9); backdrop-filter: blur(12px);
                        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 99px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.8);
                    }
                    .badge { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; }
                    .dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 10px #3b82f6; }
                    .brand { font-weight: 800; color: #3b82f6; letter-spacing: -0.02em; }
                    .remix-btn {
                        padding: 5px 12px; background: #3b82f6; color: #fff; border-radius: 12px;
                        text-decoration: none; font-size: 11px; font-weight: 700; text-transform: uppercase;
                        margin-left: 4px; transition: transform 0.2s;
                    }
                    .remix-btn:hover { transform: scale(1.05); background: #2563eb; }

                    .activating {
                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                        height: 100%; gap: 16px;
                    }
                    .loader { width: 32px; height: 32px; border: 2px solid #222; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .status-text { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #555; }
                </style>
                ${reg.status !== 'RUNNING' ? '<meta http-equiv="refresh" content="3">' : ''}
            </head>
            <body>
                ${reg.status !== 'RUNNING' ? `
                    <div class="activating">
                        <div class="loader"></div>
                        <div class="status-text">Waking up Autonomous Sandbox...</div>
                    </div>
                ` : `
                    <iframe src="${previewUrl}"></iframe>
                    <div class="viral-overlay">
                        <div class="badge">
                            <div class="dot"></div>
                            <span>Built with <span class="brand">MultiAgent</span></span>
                        </div>
                        <a href="/remix/${previewId}" class="remix-btn">Remix</a>
                    </div>
                `}
            </body>
            </html>
        `;

        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });

    } catch {
        return new Response('Internal Gateway Error', { status: 500 });
    }
}
