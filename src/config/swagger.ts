import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Anunciar Grajaú',
      version,
      description: 'Documentação da API do portal Anunciar Grajaú',
      license: {
        name: 'MIT',
        url: 'https://spdx.org/licenses/MIT.html',
      },
      contact: {
        name: 'Suporte',
        url: 'https://anunciargrajau.com.br',
        email: 'suporte@anunciargrajau.com.br',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: 'https://api.anunciargrajau.com.br/api',
        description: 'Servidor de Produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Operações de autenticação',
      },
      {
        name: 'Usuários',
        description: 'Operações relacionadas a usuários',
      },
      {
        name: 'Empresas',
        description: 'Operações relacionadas a empresas',
      },
      {
        name: 'Profissionais',
        description: 'Operações relacionadas a profissionais',
      },
      {
        name: 'Vagas',
        description: 'Operações relacionadas a vagas de emprego',
      },
      {
        name: 'Candidaturas',
        description: 'Operações relacionadas a candidaturas a vagas',
      },
      {
        name: 'Pagamentos',
        description: 'Operações relacionadas a pagamentos e assinaturas',
      },
      {
        name: 'Blog',
        description: 'Operações relacionadas ao blog',
      },
      {
        name: 'Avaliações',
        description: 'Operações relacionadas a avaliações',
      },
      {
        name: 'Admin',
        description: 'Operações administrativas',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

export const specs = swaggerJsdoc(options); 