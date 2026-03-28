import express from 'express';
import cors from 'cors';
import generateRoutes from './routes/generate';
import statusRoutes from './routes/status';
import updateRoutes from './routes/update';
import projectRoutes from './routes/projects';
import analyticsRoutes from './routes/analytics';
import { apiRequestDurationSeconds, registry } from '@packages/utils/server';

const app = express();

app.use(cors());
app.use(express.json());

// Metrics Middleware
app.use((req, res, next) => {
    const end = apiRequestDurationSeconds.startTimer();
    res.on('finish', () => {
        end({
            method: req.method,
            route: req.path,
            status_code: res.statusCode.toString(),
        });
    });
    next();
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now(), service: 'multiagent-api' });
});

// Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

// Production-Aligned Routes
app.use('/generate', generateRoutes);
app.use('/status', statusRoutes);
app.use('/update', updateRoutes);
app.use('/projects', projectRoutes);
app.use('/analytics', analyticsRoutes);

export default app;
