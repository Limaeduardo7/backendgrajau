import { Router, Request, Response } from 'express';
import { BusinessController } from '../controllers/business.controller';
import { requireAuth, validateUser, requireRole } from '../middlewares/auth.middleware';
import uploadMiddleware from '../middlewares/uploadMiddleware';
import { validateCreateBusiness, validateUpdateBusiness, validateUpdateStatus } from '../validators/business.validator';

const router = Router();
const businessController = new BusinessController();

// Middleware para tratar erros nas rotas públicas
const handlePublicRouteErrors = (handler: (req: Request, res: Response) => Promise<any>) => 
  async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('Erro na rota pública:', error);
      res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
  };

/**
 * @swagger
 * components:
 *   schemas:
 *     Business:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - categoryId
 *       properties:
 *         id:
 *           type: string
 *           description: ID único da empresa
 *         name:
 *           type: string
 *           description: Nome da empresa
 *         description:
 *           type: string
 *           description: Descrição da empresa
 *         categoryId:
 *           type: string
 *           description: ID da categoria da empresa
 *         address:
 *           type: string
 *           description: Endereço da empresa
 *         city:
 *           type: string
 *           description: Cidade da empresa
 *         state:
 *           type: string
 *           description: Estado da empresa
 *         phone:
 *           type: string
 *           description: Telefone de contato
 *         email:
 *           type: string
 *           description: Email de contato
 *         website:
 *           type: string
 *           description: Site da empresa
 *         photos:
 *           type: array
 *           items:
 *             type: string
 *           description: URLs das fotos da empresa
 *         ownerId:
 *           type: string
 *           description: ID do proprietário da empresa
 *         approved:
 *           type: boolean
 *           description: Status de aprovação da empresa
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Data da última atualização
 */

/**
 * @swagger
 * /business:
 *   get:
 *     summary: Lista todas as empresas
 *     tags: [Empresas]
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: ID da categoria para filtrar
 *     responses:
 *       200:
 *         description: Lista de empresas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 businesses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Business'
 *                 total:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 */
router.get('/', handlePublicRouteErrors(businessController.list));
router.get('/search', handlePublicRouteErrors(businessController.list));

/**
 * @swagger
 * /business/{id}:
 *   get:
 *     summary: Obtém uma empresa pelo ID
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da empresa
 *     responses:
 *       200:
 *         description: Detalhes da empresa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Business'
 *       404:
 *         description: Empresa não encontrada
 */
router.get('/:id', businessController.getById);

// Rotas protegidas
router.use(requireAuth);
router.use(validateUser);

/**
 * @swagger
 * /business:
 *   post:
 *     summary: Cria uma nova empresa
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               website:
 *                 type: string
 *     responses:
 *       201:
 *         description: Empresa criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Business'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 */
router.post('/', requireRole(['USER', 'BUSINESS']), validateCreateBusiness, businessController.create);

/**
 * @swagger
 * /business/{id}:
 *   put:
 *     summary: Atualiza uma empresa existente
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               website:
 *                 type: string
 *     responses:
 *       200:
 *         description: Empresa atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Business'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido - usuário não é o proprietário
 *       404:
 *         description: Empresa não encontrada
 */
router.put('/:id', requireRole(['USER', 'BUSINESS']), validateUpdateBusiness, businessController.update);

/**
 * @swagger
 * /business/{id}:
 *   delete:
 *     summary: Remove uma empresa
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da empresa
 *     responses:
 *       200:
 *         description: Empresa excluída com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido - usuário não é o proprietário
 *       404:
 *         description: Empresa não encontrada
 */
router.delete('/:id', requireRole(['USER', 'BUSINESS', 'ADMIN']), businessController.delete);

/**
 * @swagger
 * /business/{id}/photos:
 *   post:
 *     summary: Adiciona fotos a uma empresa
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da empresa
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Arquivos de imagem (máximo 5)
 *     responses:
 *       200:
 *         description: Fotos adicionadas com sucesso
 *       400:
 *         description: Erro ao processar as fotos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido - usuário não é o proprietário
 *       404:
 *         description: Empresa não encontrada
 */
router.post('/:id/photos', requireRole(['USER', 'BUSINESS']), uploadMiddleware.array('photos', 5), businessController.addPhotos);

/**
 * @swagger
 * /business/{id}/photos/{photoIndex}:
 *   delete:
 *     summary: Remove uma foto de uma empresa
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da empresa
 *       - in: path
 *         name: photoIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Índice da foto a ser removida
 *     responses:
 *       200:
 *         description: Foto removida com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido - usuário não é o proprietário
 *       404:
 *         description: Empresa ou foto não encontrada
 */
router.delete('/:id/photos/:photoIndex', requireRole(['USER', 'BUSINESS']), businessController.removePhoto);

/**
 * @swagger
 * /business/{id}/status:
 *   patch:
 *     summary: Atualiza o status de uma empresa
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *       400:
 *         description: Status inválido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido - usuário não é o proprietário
 *       404:
 *         description: Empresa não encontrada
 */
router.patch('/:id/status', requireRole(['USER', 'BUSINESS']), validateUpdateStatus, businessController.updateStatus);

/**
 * @swagger
 * /api/businesses/pending:
 *   get:
 *     summary: Lista empresas com status pendente (apenas para administradores)
 *     tags: [Businesses]
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
 *         description: Lista de empresas pendentes
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso proibido - apenas admin
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/pending', requireAuth, requireRole(['ADMIN']), businessController.getPendingBusinesses);

export default router; 