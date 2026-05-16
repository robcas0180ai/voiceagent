import { Router } from 'express';
import { makeCall, respondToCall, callStatus, getCalls } from '../controllers/calls.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Webhooks de Twilio (sin auth)
router.post('/status', callStatus);
router.post('/respond/:callId', respondToCall);

// Rutas protegidas
router.use(authMiddleware);
router.get('/', getCalls);
router.post('/contact/:contactId', makeCall);

export default router;
