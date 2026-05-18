import { Router } from 'express';
import { makeCall, respondToCall, recordingCallback, callStatus, getCalls } from '../controllers/calls.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Webhooks de Twilio (sin auth)
router.post('/status', callStatus);
router.post('/respond/:callId', respondToCall);
router.post('/recording/:callId', recordingCallback);

// Rutas protegidas
router.use(authMiddleware);
router.get('/', getCalls);
router.post('/contact/:contactId', makeCall);

export default router;
