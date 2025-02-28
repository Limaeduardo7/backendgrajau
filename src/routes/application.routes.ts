import { Router } from 'express';
import applicationController from '../controllers/application.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Candidatar-se a uma vaga
router.post('/jobs/:jobId/apply', requireAuth, applicationController.applyToJob);

// Listar candidaturas a uma vaga (para empresas)
router.get('/jobs/:jobId/applications', requireAuth, applicationController.getJobApplications);

// Listar minhas candidaturas (para profissionais)
router.get('/my', requireAuth, applicationController.getMyApplications);

// Atualizar status de uma candidatura (para empresas)
router.patch('/:id/status', requireAuth, applicationController.updateApplicationStatus);

// Cancelar uma candidatura (para profissionais)
router.delete('/:id', requireAuth, applicationController.cancelApplication);

export default router; 