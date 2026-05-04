import { Router } from 'express';
import { getLiveCertification } from '@packages/utils';

const router = Router();

/**
 * GET /api/system/certification
 * Returns the real-time certification status and confidence score of the platform.
 */
router.get('/certification', async (req, res) => {
    const cert = await getLiveCertification();

    if (!cert) {
        return res.status(503).json({
            status: 'UNKNOWN',
            message: 'Validation Daemon is not reporting health. System assumed UNSAFE.',
            confidence: 0
        });
    }

    res.json(cert);
});

export default router;
