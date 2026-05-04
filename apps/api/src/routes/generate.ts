import { Router } from 'express';
import { generateApp, generateDAG } from '../controllers/generateController';

const router: Router = Router();

router.post('/', generateApp);
router.post('/dag', generateDAG);

export default router;

