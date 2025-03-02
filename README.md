# Backend Anunciar Grajaú

Este é o backend da aplicação Anunciar Grajaú, uma plataforma para conectar empresas, profissionais e oportunidades na região do Grajaú.

## Melhorias Implementadas

### 1. Middleware de Prefixo de API

Foi implementado um middleware para garantir que todas as rotas tenham o prefixo `/api/`. Isso padroniza as chamadas de API e facilita a configuração de proxies e balanceadores de carga.

O middleware está localizado em `src/middlewares/apiPrefixMiddleware.ts` e é aplicado no arquivo `src/app.ts`.

### 2. Mecanismo de Retry

Foi implementado um mecanismo de retry para operações que podem falhar temporariamente, como consultas ao banco de dados. Isso aumenta a resiliência da aplicação e reduz a ocorrência de erros 500 para o usuário final.

O mecanismo está localizado em `src/utils/retryHandler.ts` e foi aplicado nos seguintes métodos do serviço de blog:

- `list`: Listagem de posts
- `getById`: Busca de post por ID
- `getBySlug`: Busca de post por slug
- `listCategories`: Listagem de categorias
- `getCategoryById`: Busca de categoria por ID
- `getCommentsByPostId`: Busca de comentários por post

### 3. Instruções para o Frontend

Foi criado um arquivo `FRONTEND_INSTRUCTIONS.md` com instruções detalhadas para o frontend implementar:

- Verificação de prefixos nos endpoints
- Mecanismo de retry para chamadas de API
- Tratamento de erro robusto
- Dados de fallback para quando a API estiver indisponível
- Hook personalizado para fazer requisições com retry e fallback
- Componente de Error Boundary para capturar erros em componentes filhos

## Tecnologias Utilizadas

- Node.js
- TypeScript
- Express
- Prisma ORM
- PostgreSQL (via Supabase)
- Jest (testes)
- Swagger (documentação da API)
- Mercado Pago (pagamentos)
- Winston (logging)
- Sentry (monitoramento de erros)

## Requisitos

- Node.js 18+
- npm ou yarn
- PostgreSQL (ou acesso ao Supabase)

## Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/anunciar-grajau-backend.git
cd anunciar-grajau-backend
```

2. Instale as dependências:

```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente:

Crie um arquivo `.env` na raiz do projeto com base no arquivo `.env.example`.

4. Execute as migrações do banco de dados:

```bash
npx prisma migrate dev
```

5. Gere o cliente Prisma:

```bash
npx prisma generate
```

6. Verifique as variáveis de ambiente:

```bash
npm run check-env
```

## Executando o Projeto

### Desenvolvimento

```bash
npm run dev
# ou
yarn dev
```

### Produção

```bash
npm run build
npm start
# ou
yarn build
yarn start
```

## Deploy

Para fazer o deploy da aplicação em um ambiente de produção, siga as instruções detalhadas no arquivo [DEPLOY.md](DEPLOY.md).

### Scripts de Deploy

O projeto inclui vários scripts para facilitar o processo de deploy:

```bash
# Verificação pré-deploy (verifica se tudo está pronto para o deploy)
npm run pre-deploy

# Configuração inicial do deploy (instala dependências, gera cliente Prisma e compila)
npm run deploy:setup

# Inicia a aplicação com PM2
npm run deploy:start

# Reinicia a aplicação com PM2
npm run deploy:restart

# Para a aplicação
npm run deploy:stop

# Verifica os logs da aplicação
npm run deploy:logs

# Verifica o status da aplicação
npm run deploy:status
```

### Deploy Automatizado

Para um deploy automatizado, você pode usar o script de deploy incluído:

```bash
# Dê permissão de execução ao script
chmod +x scripts/deploy.sh

# Execute o script de deploy
./scripts/deploy.sh
```

Este script realiza todas as etapas necessárias para o deploy, incluindo:
- Verificação pré-deploy
- Backup do banco de dados
- Atualização de dependências
- Geração do cliente Prisma
- Execução de migrações
- Compilação do projeto
- Inicialização/reinicialização da aplicação com PM2

## Testes

### Executando Testes Unitários

```bash
npm run test:unit
# ou
yarn test:unit
```

### Executando Testes de Integração

```bash
npm run test:integration
# ou
yarn test:integration
```

### Cobertura de Testes

```bash
npm run test:coverage
# ou
yarn test:coverage
```

## Documentação da API

A documentação da API está disponível em `/api-docs` quando o servidor estiver em execução.

## Monitoramento e Logs

### Logs

Os logs são gerenciados pelo Winston e estão configurados para:

- Em desenvolvimento: exibir todos os logs no console
- Em produção: salvar logs em arquivos com rotação diária na pasta `logs/`

Os níveis de log são:

- `error`: Erros críticos que afetam o funcionamento da aplicação
- `warn`: Avisos importantes que não impedem o funcionamento
- `info`: Informações gerais sobre o estado da aplicação
- `http`: Logs de requisições HTTP
- `debug`: Informações detalhadas para depuração

### Monitoramento

Em produção, a aplicação utiliza o Sentry para monitoramento de erros e performance. Para configurar:

1. Crie uma conta no [Sentry](https://sentry.io)
2. Obtenha sua DSN
3. Configure a variável `SENTRY_DSN` no arquivo `.env`

## Backup do Banco de Dados

### Backup Manual

```bash
# Backup local
npm run backup

# Backup para S3
npm run backup:s3
```

### Backup Automático

Para configurar backups automáticos:

1. Configure as variáveis de ambiente relacionadas a backup no arquivo `.env`
2. Execute o script de configuração do cron job:

```bash
node scripts/setup-cron.js
```

## Estrutura do Projeto

```
src/
├── __tests__/         # Testes unitários e de integração
├── config/            # Configurações (banco de dados, autenticação, etc.)
├── controllers/       # Controladores da API
├── middlewares/       # Middlewares (autenticação, validação, etc.)
├── routes/            # Rotas da API
├── services/          # Serviços (lógica de negócio)
├── utils/             # Utilitários
├── validators/        # Validadores de dados
├── app.ts             # Configuração do Express
└── server.ts          # Ponto de entrada da aplicação
scripts/
├── backup.js          # Script de backup do banco de dados
├── deploy.sh          # Script de deploy automatizado
├── pre-deploy-check.js # Verificação pré-deploy
└── setup-cron.js      # Script para configurar cron jobs
docs/
└── ADMIN_GUIDE.md     # Guia para administradores do sistema
```

## Módulos Principais

### Autenticação

- Registro e login de usuários
- Autenticação via JWT
- Controle de acesso baseado em papéis (RBAC)

### Empresas

- Cadastro e gerenciamento de empresas
- Aprovação de empresas
- Avaliações e comentários

### Profissionais

- Cadastro e gerenciamento de profissionais
- Aprovação de profissionais
- Avaliações e comentários

### Vagas de Emprego

- Publicação e gerenciamento de vagas
- Candidaturas
- Aprovação de vagas

### Pagamentos

- Assinaturas e planos
- Integração com Mercado Pago
- Renovação automática
- Faturas e comprovantes

### Blog

- Publicação e gerenciamento de posts
- Categorias
- Comentários

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes. 