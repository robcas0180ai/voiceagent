import { Router } from 'express';
import { makeCall, respondToCall, recordingCallback, callStatus, getCalls, amdCallback, recordingProxy } from '../controllers/calls.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Webhooks de Twilio (sin auth)
router.post('/status', callStatus);
router.post('/respond/:callId', respondToCall);
router.post('/recording/:callId', recordingCallback);
router.post('/amd', amdCallback);
router.get('/recording-proxy/:callId', recordingProxy);

// Rutas protegidas
router.use(authMiddleware);
router.get('/', getCalls);
router.post('/contact/:contactId', makeCall);

export default router;
