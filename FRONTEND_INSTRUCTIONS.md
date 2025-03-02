# Instruções para o Frontend

Este documento contém instruções para implementar melhorias no frontend do Anunciar Grajaú, especialmente para lidar com erros de API e melhorar a experiência do usuário.

## 1. Verificação de Prefixos nos Endpoints

Todos os endpoints no arquivo de configuração da API devem começar com `/api/`. Verifique se todos os endpoints estão configurados corretamente.

```javascript
// Exemplo de configuração correta
const API_ENDPOINTS = {
  FEATURED_POSTS: '/api/blog/posts/featured',
  FEATURED_BUSINESSES: '/api/businesses/search?featured=true',
  FEATURED_JOBS: '/api/jobs/search?featured=true',
};
```

## 2. Implementação de Mecanismo de Retry

Implemente um mecanismo de retry para os endpoints que estão retornando 500, especialmente para o `/api/blog/posts/featured`.

```javascript
// Exemplo de função para fazer requisições com retry
async function fetchWithRetry(url, options = {}, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(`Status ${response.status}: ${errorData.message || 'Erro desconhecido'}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Tentativa ${attempt + 1}/${maxRetries + 1} falhou:`, error);
      lastError = error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Backoff exponencial
    }
  }
  
  throw lastError;
}
```

## 3. Tratamento de Erro Robusto

Adicione tratamento de erro mais robusto nas páginas que consomem esses endpoints, exibindo mensagens amigáveis para o usuário quando ocorrerem falhas.

```javascript
// Exemplo de componente para exibir mensagens de erro
function ErrorMessage({ message, retry, type = 'error' }) {
  return (
    <div className={`error-message ${type}`}>
      <div className="error-icon">
        {type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
      </div>
      <div className="error-content">
        <h3>{type === 'error' ? 'Erro' : type === 'warning' ? 'Atenção' : 'Informação'}</h3>
        <p>{message || 'Ocorreu um erro ao carregar os dados. Por favor, tente novamente mais tarde.'}</p>
        {retry && (
          <button onClick={retry} className="retry-button">
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}
```

## 4. Dados de Fallback

Crie dados de fallback para quando a API estiver indisponível, permitindo que a aplicação continue funcionando mesmo com problemas no backend.

```javascript
// Exemplo de dados de fallback para posts em destaque
const FALLBACK_FEATURED_POSTS = {
  posts: [
    {
      id: 'fallback-1',
      title: 'Como encontrar as melhores oportunidades de emprego no Grajaú',
      slug: 'como-encontrar-melhores-oportunidades-emprego-grajau',
      excerpt: 'Descubra estratégias eficazes para encontrar as melhores vagas de emprego na região do Grajaú.',
      imageUrl: '/images/fallback/blog-post-1.jpg',
      createdAt: new Date().toISOString(),
      featured: true,
      author: {
        name: 'Equipe Anunciar Grajaú',
      },
      category: {
        name: 'Carreira',
      }
    },
    // Adicione mais posts de fallback conforme necessário
  ],
  total: 1,
  pages: 1,
  currentPage: 1
};
```

## 5. Implementação de um Hook Personalizado

Crie um hook personalizado para fazer requisições com retry e fallback:

```javascript
import { useState, useEffect, useCallback } from 'react';

function useApiWithRetry({
  url,
  method = 'GET',
  body,
  headers = {},
  fallbackData,
  maxRetries = 3,
  delay = 1000,
  onSuccess,
  onError,
  skip = false
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsFallback(false);

    try {
      // Verificar se a URL começa com /api/
      const apiUrl = url.startsWith('/api/') ? url : `/api${url.startsWith('/') ? url : `/${url}`}`;
      
      const result = await fetchWithRetry(
        apiUrl,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined
        },
        maxRetries,
        delay
      );

      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error('Erro na requisição:', err);
      setError(err);
      setIsFallback(true);
      setData(fallbackData);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, method, body, headers, fallbackData, maxRetries, delay, onSuccess, onError]);

  useEffect(() => {
    if (!skip) {
      fetchData();
    }
  }, [skip, fetchData]);

  return { data, loading, error, refetch: fetchData, isFallback };
}
```

## 6. Implementação de um Componente de Erro Boundary

Adicione um componente de Error Boundary para capturar erros em componentes filhos:

```javascript
import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-boundary">
          <h2>Algo deu errado.</h2>
          <p>Ocorreu um erro ao carregar este conteúdo. Por favor, tente novamente mais tarde.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="retry-button"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 7. Exemplo de Uso

Aqui está um exemplo de como usar essas implementações em um componente:

```javascript
import React from 'react';
import useApiWithRetry from './hooks/useApiWithRetry';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorMessage from './components/ErrorMessage';
import { FALLBACK_FEATURED_POSTS } from './constants/fallbackData';

function FeaturedPosts() {
  const { data, loading, error, refetch, isFallback } = useApiWithRetry({
    url: '/api/blog/posts/featured',
    fallbackData: FALLBACK_FEATURED_POSTS,
    maxRetries: 3
  });

  if (loading) {
    return <div className="loading">Carregando posts em destaque...</div>;
  }

  if (error && !data) {
    return (
      <ErrorMessage
        message="Não foi possível carregar os posts em destaque. Por favor, tente novamente mais tarde."
        retry={refetch}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="featured-posts">
        {isFallback && (
          <div className="fallback-notice">
            Exibindo conteúdo offline. Alguns dados podem estar desatualizados.
          </div>
        )}
        <h2>Posts em Destaque</h2>
        <div className="posts-grid">
          {data?.posts.map(post => (
            <div key={post.id} className="post-card">
              <img src={post.imageUrl || '/images/fallback/blog-post.jpg'} alt={post.title} />
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <a href={`/blog/${post.slug}`}>Ler mais</a>
            </div>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
```

## Conclusão

Implementando essas melhorias, o frontend se tornará mais resiliente a falhas na API e proporcionará uma melhor experiência para o usuário, mesmo quando ocorrerem problemas no backend.

Lembre-se de adaptar essas implementações de acordo com a estrutura e necessidades específicas do seu projeto. 