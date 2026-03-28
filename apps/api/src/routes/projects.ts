import { Router } from 'express';
import { projectController } from '../controllers/projectController';

const router = Router();

router.get('/', projectController.list);
router.get('/:projectId', projectController.get);
router.post('/', projectController.create);
router.post('/:projectId/restore/:versionId', projectController.restore);

export default router;
