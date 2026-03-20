import { NextRequest, NextResponse } from 'next/server';
import logger from './logger';
import { runWithTracing } from './tracing';

export type ApiHandler = (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>;

export function withObservability(handler: ApiHandler) {
    return async (req: NextRequest, ..._args: unknown[]) => {
        const correlationId = req.headers.get('x-correlation-id') || undefined;
        const start = Date.now();

        return runWithTracing(correlationId, async () => {
            try {
                const response = await handler(req, ..._args);
                const duration = Date.now() - start;

                logger.info({
                    url: req.url,
                    method: req.method,
                    status: response.status,
                    durationMs: duration
                }, 'API request completed');

                return response;
            } catch (error: unknown) {
                const duration = Date.now() - start;
                const err = error as { status?: number; message?: string; stack?: string };
                const statusCode = err.status || 500;

                logger.error({
                    url: req.url,
                    method: req.method,
                    error: {
                        message: err.message,
                        stack: err.stack,
                        ...err
                    },
                    durationMs: duration
                }, 'API request failed');

                return NextResponse.json({
                    error: process.env.NODE_ENV === 'production'
                        ? 'Internal Server Error'
                        : err.message || 'Unknown error',
                    correlationId: correlationId
                }, { status: statusCode });
            }
        });
    };
}
