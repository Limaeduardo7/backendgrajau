import { Router } from 'express';
import userController from '../controllers/user.controller';

const router = Router();

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Obtém o perfil do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do usuário
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/profile', userController.getProfile);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Atualiza o perfil do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               document:
 *                 type: string
 *               documentType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *       401:
 *         description: Não autorizado
 */
router.put('/profile', userController.updateProfile);

/**
 * @swagger
 * /users/businesses:
 *   get:
 *     summary: Obtém as empresas do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de itens por página
 *     responses:
 *       200:
 *         description: Lista de empresas do usuário
 *       401:
 *         description: Não autorizado
 */
router.get('/businesses', userController.getBusinesses);

/**
 * @swagger
 * /users/applications:
 *   get:
 *     summary: Obtém as candidaturas do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de itens por página
 *     responses:
 *       200:
 *         description: Lista de candidaturas do usuário
 *       401:
 *         description: Não autorizado
 */
router.get('/applications', userController.getApplications);

/**
 * @swagger
 * /users/notifications:
 *   get:
 *     summary: Obtém as notificações do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de itens por página
 *     responses:
 *       200:
 *         description: Lista de notificações do usuário
 *       401:
 *         description: Não autorizado
 */
router.get('/notifications', userController.getNotifications);

export default router; 