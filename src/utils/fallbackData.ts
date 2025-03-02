/**
 * Dados de fallback para quando a API estiver indisponível
 */

/**
 * Dados de fallback para posts do blog em destaque
 */
export const featuredBlogPostsFallback = {
  posts: [
    {
      id: 'fallback-1',
      title: 'Como encontrar as melhores oportunidades de emprego no Grajaú',
      slug: 'como-encontrar-melhores-oportunidades-emprego-grajau',
      excerpt: 'Descubra estratégias eficazes para encontrar as melhores vagas de emprego na região do Grajaú.',
      content: 'Conteúdo temporariamente indisponível. Por favor, tente novamente mais tarde.',
      imageUrl: '/images/fallback/blog-post-1.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      featured: true,
      author: {
        id: 'fallback-author-1',
        name: 'Equipe Anunciar Grajaú',
      },
      category: {
        id: 'fallback-category-1',
        name: 'Carreira',
      }
    },
    {
      id: 'fallback-2',
      title: 'Empreendedorismo local: histórias de sucesso no Grajaú',
      slug: 'empreendedorismo-local-historias-sucesso-grajau',
      excerpt: 'Conheça histórias inspiradoras de empreendedores que transformaram o cenário econômico do Grajaú.',
      content: 'Conteúdo temporariamente indisponível. Por favor, tente novamente mais tarde.',
      imageUrl: '/images/fallback/blog-post-2.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      featured: true,
      author: {
        id: 'fallback-author-2',
        name: 'Equipe Anunciar Grajaú',
      },
      category: {
        id: 'fallback-category-2',
        name: 'Empreendedorismo',
      }
    },
    {
      id: 'fallback-3',
      title: 'Dicas para se destacar em entrevistas de emprego',
      slug: 'dicas-destacar-entrevistas-emprego',
      excerpt: 'Aprenda técnicas eficazes para se destacar em entrevistas de emprego e conquistar a vaga dos seus sonhos.',
      content: 'Conteúdo temporariamente indisponível. Por favor, tente novamente mais tarde.',
      imageUrl: '/images/fallback/blog-post-3.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      featured: true,
      author: {
        id: 'fallback-author-1',
        name: 'Equipe Anunciar Grajaú',
      },
      category: {
        id: 'fallback-category-1',
        name: 'Carreira',
      }
    }
  ],
  total: 3,
  pages: 1,
  currentPage: 1
};

/**
 * Dados de fallback para empresas em destaque
 */
export const featuredBusinessesFallback = {
  businesses: [
    {
      id: 'fallback-business-1',
      name: 'Empresa Exemplo 1',
      description: 'Uma empresa fictícia para exibição quando a API estiver indisponível.',
      address: 'Av. Principal, 123 - Grajaú',
      city: 'São Paulo',
      state: 'SP',
      phone: '(11) 99999-9999',
      email: 'contato@exemplo1.com',
      website: 'https://www.exemplo1.com',
      photos: ['/images/fallback/business-1.jpg'],
      featured: true,
      category: {
        id: 'fallback-category-1',
        name: 'Comércio',
      }
    },
    {
      id: 'fallback-business-2',
      name: 'Empresa Exemplo 2',
      description: 'Outra empresa fictícia para exibição quando a API estiver indisponível.',
      address: 'Rua Secundária, 456 - Grajaú',
      city: 'São Paulo',
      state: 'SP',
      phone: '(11) 88888-8888',
      email: 'contato@exemplo2.com',
      website: 'https://www.exemplo2.com',
      photos: ['/images/fallback/business-2.jpg'],
      featured: true,
      category: {
        id: 'fallback-category-2',
        name: 'Serviços',
      }
    }
  ],
  total: 2,
  pages: 1,
  currentPage: 1
};

/**
 * Dados de fallback para vagas em destaque
 */
export const featuredJobsFallback = {
  jobs: [
    {
      id: 'fallback-job-1',
      title: 'Desenvolvedor Web',
      description: 'Vaga fictícia para exibição quando a API estiver indisponível.',
      requirements: 'Conhecimento em HTML, CSS e JavaScript.',
      benefits: 'Vale-refeição, vale-transporte, plano de saúde.',
      salary: 'R$ 3.000,00 a R$ 4.000,00',
      location: 'Grajaú, São Paulo - SP',
      type: 'CLT',
      featured: true,
      business: {
        id: 'fallback-business-1',
        name: 'Empresa Exemplo 1',
      }
    },
    {
      id: 'fallback-job-2',
      title: 'Assistente Administrativo',
      description: 'Vaga fictícia para exibição quando a API estiver indisponível.',
      requirements: 'Ensino médio completo, conhecimento em Excel.',
      benefits: 'Vale-refeição, vale-transporte.',
      salary: 'R$ 1.800,00',
      location: 'Grajaú, São Paulo - SP',
      type: 'CLT',
      featured: true,
      business: {
        id: 'fallback-business-2',
        name: 'Empresa Exemplo 2',
      }
    }
  ],
  total: 2,
  pages: 1,
  currentPage: 1
}; 