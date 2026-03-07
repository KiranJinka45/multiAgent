import { NextResponse } from 'next/server';
import { registry } from '@configs/metrics';
import logger from '@configs/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prometheus
 *
 * Scrape endpoint for Prometheus.
 * Returns all registered metrics in the standard Prometheus text format.
 *
 * Security: 
 *   - In production, this should be protected by a VPN, 
 *     internal network, or a shared secret (Bearer token).
 */
export async function GET(req: Request) {
    try {
        // Authenticate the scraper (optional: allow internal IP range)
        const authHeader = req.headers.get('authorization');
        const metricsToken = process.env.PROMETHEUS_SCRAPE_TOKEN;

        if (metricsToken && authHeader !== `Bearer ${metricsToken}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const metrics = await registry.metrics();

        return new NextResponse(metrics, {
            status: 200,
            headers: {
                'Content-Type': registry.contentType,
            },
        });
    } catch (err) {
        logger.error({ err }, '[MetricsAPI] Failed to generate prometheus metrics');
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
