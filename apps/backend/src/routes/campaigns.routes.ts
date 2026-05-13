import { Router } from 'express';
import { getCampaigns, createCampaign, getCampaign, updateCampaign, deleteCampaign } from '../controllers/campaigns.controller';
import { getContacts, createContact, bulkCreateContacts, updateContactStage } from '../controllers/contacts.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

// Campañas
router.get('/', getCampaigns);
router.post('/', createCampaign);
router.get('/:id', getCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

// Contactos por campaña
router.get('/:campaignId/contacts', getContacts);
router.post('/:campaignId/contacts', createContact);
router.post('/:campaignId/contacts/bulk', bulkCreateContacts);
router.put('/:campaignId/contacts/:id', updateContactStage);

export default router;
