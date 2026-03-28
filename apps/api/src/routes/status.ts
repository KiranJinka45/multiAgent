import { Router } from 'express';
import { getStatus } from '../controllers/statusController';

const router = Router();

router.get('/:missionId', getStatus);

export default router;
