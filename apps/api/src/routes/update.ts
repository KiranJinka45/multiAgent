import { Router } from 'express';
import { updateController } from '../controllers/updateController';

const router: Router = Router();

router.post('/', updateController);

export default router;

