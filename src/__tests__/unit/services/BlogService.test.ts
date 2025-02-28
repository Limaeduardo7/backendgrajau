import { BlogService } from '../../../../src/services/blog.service';
import prisma from '../../../../src/config/prisma';
import { ApiError } from '../../../../src/utils/ApiError';

// Mock do prisma
jest.mock('../../../../src/config/prisma', () => ({
  __esModule: true,
  default: {
    blogPost: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock do fs
jest.mock('fs', () => ({
  unlinkSync: jest.fn(),
}));

describe('BlogService', () => {
  let blogService: BlogService;

  beforeEach(() => {
    blogService = new BlogService();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('deve listar posts com paginação', async () => {
      const mockPosts = [
        { id: '1', title: 'Post 1', content: 'Conteúdo 1' },
        { id: '2', title: 'Post 2', content: 'Conteúdo 2' },
      ];
      
      (prisma.blogPost.findMany as jest.Mock).mockResolvedValueOnce(mockPosts);
      (prisma.blogPost.count as jest.Mock).mockResolvedValueOnce(2);

      const result = await blogService.list({ page: 1, limit: 10 });

      expect(result).toEqual({
        posts: mockPosts,
        total: 2,
        pages: 1,
        currentPage: 1,
      });
      
      expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { published: true },
          skip: 0,
          take: 10,
        })
      );
    });

    it('deve filtrar posts por termo de busca', async () => {
      const mockPosts = [{ id: '1', title: 'Post de Teste', content: 'Conteúdo de teste' }];
      
      (prisma.blogPost.findMany as jest.Mock).mockResolvedValueOnce(mockPosts);
      (prisma.blogPost.count as jest.Mock).mockResolvedValueOnce(1);

      const result = await blogService.list({ 
        page: 1, 
        limit: 10,
        search: 'teste'
      });

      expect(result.posts).toEqual(mockPosts);
      expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                title: expect.objectContaining({
                  contains: 'teste',
                }),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('getById', () => {
    it('deve retornar um post pelo ID', async () => {
      const mockPost = { 
        id: '1', 
        title: 'Post de Teste', 
        content: 'Conteúdo de teste',
        author: { name: 'Autor Teste', email: 'autor@teste.com' },
        category: { id: '1', name: 'Categoria Teste' },
        comments: []
      };
      
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValueOnce(mockPost);

      const result = await blogService.getById('1');

      expect(result).toEqual(mockPost);
      expect(prisma.blogPost.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('deve lançar erro quando o post não for encontrado', async () => {
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(blogService.getById('999')).rejects.toThrow(ApiError);
      await expect(blogService.getById('999')).rejects.toThrow('Post não encontrado');
    });
  });

  describe('getCategoryById', () => {
    it('deve retornar uma categoria pelo ID', async () => {
      const mockCategory = { 
        id: '1', 
        name: 'Categoria Teste',
        posts: []
      };
      
      (prisma.category.findUnique as jest.Mock).mockResolvedValueOnce(mockCategory);

      const result = await blogService.getCategoryById('1');

      expect(result).toEqual(mockCategory);
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('deve lançar erro quando a categoria não for encontrada', async () => {
      (prisma.category.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(blogService.getCategoryById('999')).rejects.toThrow(ApiError);
      await expect(blogService.getCategoryById('999')).rejects.toThrow('Categoria não encontrada');
    });
  });
}); 