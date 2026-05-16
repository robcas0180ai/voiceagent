import { Router } from 'express';
import { getAgentConfig, saveAgentConfig } from '../controllers/agent.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', getAgentConfig);
router.post('/', saveAgentConfig);

export default router;
