import { Registry, collectDefaultMetrics } from 'prom-client';

const serviceName = process.env.SERVICE_NAME || 'multiagent-service';
export const metricPrefix = process.env.METRIC_PREFIX || (serviceName.split('-').pop() + '_');

export const registry = new Registry();

// Default metrics (CPU, Memory, Event Loop) with service prefix
collectDefaultMetrics({ 
    register: registry,
    prefix: metricPrefix 
});
