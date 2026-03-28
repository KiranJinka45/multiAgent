import { Router } from 'express';
import { AnalyticsService } from '../services/analytics-service';

const router = Router();

router.post('/wow', async (req, res) => {
    try {
        const { projectId } = req.body;
        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }

        await AnalyticsService.trackWowMoment(projectId);
        res.json({ success: true });
    } catch (error) {
        console.error('[Analytics WOW] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
