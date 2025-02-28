# Estrutura de Testes do Projeto Anunciar Grajaú

Este documento descreve a estrutura de testes implementada para o backend do projeto Anunciar Grajaú.

## Estrutura de Diretórios

```
src/__tests__/
├── integration/
│   ├── auth.test.ts
│   ├── business.test.ts
│   └── payment.test.ts
└── unit/
    ├── middlewares/
    │   └── auth.middleware.test.ts
    └── services/
        ├── BlogService.test.ts
        └── EmailService.test.ts
```

## Testes Unitários

Os testes unitários são focados em testar componentes individuais do sistema de forma isolada, utilizando mocks para simular dependências externas.

### Serviços

1. **EmailService.test.ts**
   - Testa o envio de emails
   - Verifica o comportamento em caso de sucesso e erro
   - Testa os métodos específicos como `sendWelcomeEmail` e `sendJobApplicationEmail`

2. **BlogService.test.ts**
   - Testa a listagem de posts com paginação
   - Verifica a filtragem por termo de busca
   - Testa a obtenção de posts e categorias por ID
   - Verifica o tratamento de erros quando recursos não são encontrados

### Middlewares

1. **auth.middleware.test.ts**
   - Testa o middleware de autenticação `requireAuth`
   - Verifica a criação de usuários quando não existem no banco
   - Testa o middleware de verificação de papéis `requireRole`
   - Verifica o comportamento em caso de erro ou falta de permissões

## Testes de Integração

Os testes de integração verificam a interação entre diferentes componentes do sistema, testando as rotas da API e o fluxo completo de requisições.

1. **auth.test.ts**
   - Testa o processamento de webhooks do Clerk
   - Verifica a obtenção de dados do usuário autenticado
   - Testa a atualização de perfil

2. **business.test.ts**
   - Testa a listagem de empresas com paginação e filtros
   - Verifica a obtenção de detalhes de uma empresa
   - Testa a criação, atualização e exclusão de empresas
   - Verifica o comportamento em caso de erro ou falta de permissões

3. **payment.test.ts**
   - Testa a listagem de planos disponíveis
   - Verifica a criação de assinaturas
   - Testa o cancelamento de assinaturas
   - Verifica a listagem de faturas
   - Testa o processamento de webhooks de pagamento

## Configuração

O projeto utiliza Jest como framework de testes, com as seguintes configurações:

- **jest.config.js**: Configuração principal do Jest
- **jest.setup.js**: Configurações adicionais, como timeout e mocks globais

## Como Executar os Testes

```bash
# Executar todos os testes
npm test

# Executar testes com watch mode
npm run test:watch

# Executar testes com cobertura
npm run test:coverage

# Executar testes em ambiente de CI
npm run test:ci
```

## Cobertura de Código

O projeto tem como meta uma cobertura mínima de 70% para:
- Branches
- Funções
- Linhas
- Statements

## Próximos Passos

1. Implementar testes para os controladores restantes
2. Adicionar testes para os middlewares de validação
3. Expandir os testes de integração para cobrir mais rotas
4. Implementar testes end-to-end com um banco de dados de teste 