import { NextRequest, NextResponse } from 'next/server';
import { PreviewRegistry } from '@libs/registry';
import { ClusterProxy } from '@libs/runtime/clusterProxy';
import { RuntimeGuard } from '@libs/runtime/runtimeGuard';
import { RuntimeMetrics } from '@libs/runtime/runtimeMetrics';
import logger from '@libs/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/preview-proxy/[projectId]/[[...path]]
 *
 * Reverse-proxies requests to the locally running dev server for this project.
 * Keeps the iframe on the same origin, eliminating CSP/CORS/X-Frame-Options issues.
 *
 * Security:
 *  - RuntimeGuard.validateProxyTarget() prevents SSRF
 *  - Only allowed hosts (localhost) are proxied
 *  - Port must match the registered lease
 *
 * In production: replace with nginx/Caddy upstream or Cloudflare Tunnel.
 */
/**
 * Reverse-proxies requests to the locally running dev server for this project.
 */
async function handleProxy(
    req: NextRequest,
    params: { projectId: string; path?: string[] }
) {
    const { projectId } = params;
    const subPath = params.path ? `/${params.path.join('/')}` : '/';

    try {
        const record = await PreviewRegistry.get(projectId);

        if (!record || !record.port) {
            return _waitingResponse();
        }

        if (record.status === 'STARTING') {
            return _waitingResponse();
        }

        if (record.status !== 'RUNNING') {
            return _errorResponse('Preview server is not running');
        }

        // Phase 5: Build and validate upstream URL (SSRF guard + Cluster routing)
        const target = await ClusterProxy.resolveTarget(projectId);
        if (!target) {
            return _errorResponse('Could not resolve worker node for this preview');
        }

        const upstreamUrl = `${target.url}${subPath}${req.nextUrl.search}`;
        try {
            // SSRF guard
            RuntimeGuard.validateProxyTarget(upstreamUrl, target.port, true);
        } catch (guardErr) {
            logger.error({ projectId, upstreamUrl, guardErr }, '[PreviewProxy] SSRF guard blocked request');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Forward request headers (strip hop-by-hop headers)
        const forwardHeaders: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            const skip = ['host', 'connection', 'keep-alive', 'upgrade', 'proxy-authorization'];
            if (!skip.includes(key.toLowerCase())) {
                forwardHeaders[key] = value;
            }
        });

        // Forward body for non-GET/HEAD methods
        const hasBody = !['GET', 'HEAD'].includes(req.method);
        const body = hasBody ? await req.arrayBuffer() : undefined;

        const upstreamRes = await fetch(upstreamUrl, {
            method: req.method,
            headers: forwardHeaders,
            body
        });

        // Record user activity for inactivity TTL
        await RuntimeMetrics.recordActivity(projectId);

        // Copy response headers
        const responseHeaders = new Headers();
        upstreamRes.headers.forEach((value, key) => {
            // Strip headers that prevent iframe embedding
            const strip = ['x-frame-options', 'content-security-policy'];
            if (!strip.includes(key.toLowerCase())) {
                responseHeaders.set(key, value);
            }
        });
        responseHeaders.set('x-proxied-by', 'multiagent-preview');

        const resBody = await upstreamRes.arrayBuffer();
        return new NextResponse(resBody, {
            status: upstreamRes.status,
            headers: responseHeaders,
        });

    } catch (err) {
        logger.error({ projectId, err }, '[PreviewProxy] Proxy error');
        await RuntimeMetrics.recordCrash(projectId, 'PROXY_ERROR');
        return _errorResponse('The sandbox server is not responding');
    }
}

export const GET = (req: NextRequest, { params }: { params: { projectId: string; path?: string[] } }) => handleProxy(req, params);
export const POST = (req: NextRequest, { params }: { params: { projectId: string; path?: string[] } }) => handleProxy(req, params);
export const PUT = (req: NextRequest, { params }: { params: { projectId: string; path?: string[] } }) => handleProxy(req, params);
export const DELETE = (req: NextRequest, { params }: { params: { projectId: string; path?: string[] } }) => handleProxy(req, params);
export const PATCH = (req: NextRequest, { params }: { params: { projectId: string; path?: string[] } }) => handleProxy(req, params);
export const HEAD = (req: NextRequest, { params }: { params: { projectId: string; path?: string[] } }) => handleProxy(req, params);

// ── Helpers ────────────────────────────────────────────────────────────────

function _waitingResponse(): NextResponse {
    return new NextResponse(
        `<!DOCTYPE html><html><head><style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#030303;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;
             display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px}
        .spinner{width:32px;height:32px;border:2px solid rgba(59,130,246,.2);border-top-color:#3b82f6;
                 border-radius:50%;animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        p{font-size:11px;opacity:.4;text-transform:uppercase;letter-spacing:.2em}
        </style></head>
        <body><div class="spinner"></div><p>Preview server starting…</p>
        <script>setTimeout(()=>location.reload(),3000)</script></body></html>`,
        { status: 202, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
}

function _errorResponse(msg: string): NextResponse {
    return new NextResponse(
        `<!DOCTYPE html><html><head><style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#030303;color:#ef4444;font-family:ui-sans-serif,system-ui,sans-serif;
             display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px}
        p{font-size:11px;text-transform:uppercase;letter-spacing:.2em}
        small{color:rgba(255,255,255,.3);font-size:10px}
        </style></head>
        <body><p>⚠ Preview Unavailable</p><small>${msg}</small>
        <script>setTimeout(()=>location.reload(),5000)</script></body></html>`,
        { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
}
