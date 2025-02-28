import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller.fixed';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateReview, validateReviewResponse } from '../validators/review.validator';
import { auditUserAction, auditAdminAction } from '../middlewares/audit.middleware';

const router = Router();
const reviewController = new ReviewController();

/**
 * @swagger
 * /businesses/{businessId}/reviews:
 *   post:
 *     summary: Cria uma avaliação para uma empresa
 *     tags: [Avaliações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da empresa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Avaliação de 1 a 5 estrelas
 *               comment:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: Comentário sobre a empresa
 *     responses:
 *       201:
 *         description: Avaliação criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Empresa não encontrada
 */
router.post(
  '/businesses/:businessId/reviews',
  requireAuth,
  validateReview,
  auditUserAction('CREATE_REVIEW', 'REVIEW'),
  reviewController.createBusinessReview
);

/**
 * @swagger
 * /businesses/{businessId}/reviews:
 *   get:
 *     summary: Lista avaliações de uma empresa
 *     tags: [Avaliações]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da empresa
 *     responses:
 *       200:
 *         description: Lista de avaliações
 *       404:
 *         description: Empresa não encontrada
 */
router.get(
  '/businesses/:businessId/reviews',
  reviewController.getBusinessReviews
);

/**
 * @swagger
 * /professionals/{professionalId}/reviews:
 *   post:
 *     summary: Cria uma avaliação para um profissional
 *     tags: [Avaliações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: professionalId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do profissional
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Avaliação de 1 a 5 estrelas
 *               comment:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: Comentário sobre o profissional
 *     responses:
 *       201:
 *         description: Avaliação criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Profissional não encontrado
 */
router.post(
  '/professionals/:professionalId/reviews',
  requireAuth,
  validateReview,
  auditUserAction('CREATE_REVIEW', 'REVIEW'),
  reviewController.createProfessionalReview
);

/**
 * @swagger
 * /professionals/{professionalId}/reviews:
 *   get:
 *     summary: Lista avaliações de um profissional
 *     tags: [Avaliações]
 *     parameters:
 *       - in: path
 *         name: professionalId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do profissional
 *     responses:
 *       200:
 *         description: Lista de avaliações
 *       404:
 *         description: Profissional não encontrado
 */
router.get(
  '/professionals/:professionalId/reviews',
  reviewController.getProfessionalReviews
);

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Exclui uma avaliação
 *     tags: [Avaliações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da avaliação
 *     responses:
 *       200:
 *         description: Avaliação excluída com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é o autor nem administrador
 *       404:
 *         description: Avaliação não encontrada
 */
router.delete(
  '/reviews/:id',
  requireAuth,
  auditUserAction('DELETE_REVIEW', 'REVIEW'),
  reviewController.deleteReview
);

export default router; 