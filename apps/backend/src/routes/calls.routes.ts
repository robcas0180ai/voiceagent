import { Router } from 'express';
import { makeCall, callStatus, getCalls } from '../controllers/calls.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Webhook de Twilio (sin auth)
router.post('/status', callStatus);

// Rutas protegidas
router.use(authMiddleware);
router.get('/', getCalls);
router.post('/contact/:contactId', makeCall);

export default router;
