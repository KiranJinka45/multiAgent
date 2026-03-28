import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { initTelemetry } from '@packages/observability';
import { logger, registry } from '@packages/utils/server';

initTelemetry('multiagent-auth-service');

const app = express();
const PORT = process.env.PORT || 4002;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.use(cors());
app.use(express.json());

// Mock DB
const users = [
    { id: '1', email: 'user@example.com', password: 'password', roles: ['FREE'] },
    { id: '2', email: 'pro@example.com', password: 'password', roles: ['PRO'] },
    { id: '3', email: 'admin@example.com', password: 'password', roles: ['ADMIN'] }
];

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, roles: user.roles },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, roles: user.roles } });
});

// --- INTERNAL AUTH MIDDLEWARE ---
const internalAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = req.headers['x-internal-key'];
    if (key !== (process.env.INTERNAL_KEY || 'default-internal-secret')) {
        return res.status(401).json({ error: 'Unauthorized: Internal access only' });
    }
    next();
};

app.get('/metrics', async (req: express.Request, res: express.Response) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
});

app.post('/internal/upgrade', internalAuth, (req, res) => {
    const { userId, role } = req.body;
    const user = users.find(u => u.id === userId);
    if (user) {
        if (!user.roles.includes(role)) {
            user.roles.push(role);
        }
        console.log(`[AuthService] User ${userId} upgraded to ${role}`);
        return res.json({ success: true, user });
    }
    res.status(404).json({ error: 'User not found' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'auth-service' });
});

app.listen(PORT, () => {
    console.log(`[AuthService] Running on port ${PORT}`);
});
