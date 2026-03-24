import { NextRequest, NextResponse } from 'next/server';
import { PreviewRegistry } from '@registry/previewRegistry';
import { previewManager } from '@libs/runtime/preview-manager';
import logger from '@config/logger';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const previewId = params.id;

    try {
        // 1. Resolve preview registration (try ID or ProjectId fallback)
        let reg = await PreviewRegistry.lookupByPreviewId(previewId);
        if (!reg) {
            // If they provided a ProjectId instead of a PreviewId, registry can get it
            reg = await PreviewRegistry.get(previewId);
        }

        if (!reg) {
            return new Response('Preview Session Not Found', { status: 404 });
        }

        // 1b. Security: Validate Access Token
        const url = new URL(req.url);
        const providedToken = url.searchParams.get('token') || req.headers.get('x-preview-token');
        
        // Skip token check for internal assets but require it for main entry or if registry has one
        if (reg.accessToken && providedToken !== reg.accessToken) {
             logger.warn({ previewId, providedToken }, '[PreviewGateway] Unauthorized access attempt blocked');
             return new Response('Unauthorized: Invalid Access Token', { status: 403 });
        }

        // 2. Handle Lifecycle States
        // Auto-wake if sleeping or if process is missing internally
        if (reg.status === 'STARTING') {
            return buildLoadingResponse('Initializing Isolated Architecture...');
        }

        if (reg.status === 'STOPPED' || reg.status === 'FAILED') {
            await previewManager.restartPreview(reg.projectId);
            return buildLoadingResponse('Re-activating Sandbox Container...');
        }

        // 3. Deterministic Proxy Execution
        // Standard Next.js Route Handlers don't support streaming proxy well, 
        // so we use a robust fetch-forwarder.
        
        await PreviewRegistry.recordHealthCheck(reg.projectId);
        const targetHost = '127.0.0.1';
        const target = `http://${targetHost}:${reg.port}`;
        
        return await fetchProxy(req, target, previewId);

    } catch (error) {
        logger.error({ error, previewId }, '[PreviewGateway] Proxy Fatal Error');
        return new Response('Gateway Error: Unreachable', { status: 502 });
    }
}

async function fetchProxy(req: NextRequest, targetBase: string, previewId: string): Promise<Response> {
    const url = new URL(req.url);
    const internalPath = url.pathname.replace(`/preview/${previewId}`, '') || '/';
    const targetUrl = new URL(internalPath + url.search, targetBase);

    const headers = new Headers(req.headers);
    headers.set('Host', targetUrl.host);
    headers.set('X-Forwarded-For', req.headers.get('x-forwarded-for') || '127.0.0.1');

    try {
        const response = await fetch(targetUrl.toString(), {
            method: req.method,
            headers: headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined,
            redirect: 'manual',
            cache: 'no-store'
        });

        // Bridge headers and body
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('X-Proxied-By', 'MultiAgent-Gateway-v2');

        // Handle Redirects (rewrite to stay within proxy)
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
                const absoluteLocation = new URL(location, targetBase);
                if (absoluteLocation.host === new URL(targetBase).host) {
                    const proxiedLocation = `/preview/${previewId}${absoluteLocation.pathname}${absoluteLocation.search}`;
                    return NextResponse.redirect(new URL(proxiedLocation, req.url));
                }
            }
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
    } catch {
        return new Response('Preview Server Unreachable', { status: 502 });
    }
}

function buildLoadingResponse(label: string) {
    return new Response(`
        <html>
            <head>
                <meta http-equiv="refresh" content="3">
                <style>
                    body { background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; margin: 0; }
                    .loader { border: 2px solid #222; border-top: 2px solid #3b82f6; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin-right: 15px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #666; }
                </style>
            </head>
            <body>
                <div class="loader"></div>
                <div class="label">${label}</div>
            </body>
        </html>
    `, { headers: { 'Content-Type': 'text/html' } });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
