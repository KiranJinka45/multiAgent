import { Router } from 'express';
import { generateApp } from '../controllers/generateController';

const router = Router();

router.post('/', generateApp);

export default router;
