# Guia de Administração - Anunciar Grajaú

Este guia fornece instruções detalhadas para administradores do sistema Anunciar Grajaú.

## Índice

1. [Acesso ao Painel Administrativo](#acesso-ao-painel-administrativo)
2. [Gerenciamento de Usuários](#gerenciamento-de-usuários)
3. [Aprovação de Empresas e Profissionais](#aprovação-de-empresas-e-profissionais)
4. [Gerenciamento de Planos e Pagamentos](#gerenciamento-de-planos-e-pagamentos)
5. [Gerenciamento do Blog](#gerenciamento-do-blog)
6. [Monitoramento e Logs](#monitoramento-e-logs)
7. [Backup e Restauração](#backup-e-restauração)
8. [Configurações do Sistema](#configurações-do-sistema)
9. [Resolução de Problemas Comuns](#resolução-de-problemas-comuns)

## Acesso ao Painel Administrativo

### Requisitos

- Conta de usuário com permissão de administrador
- Navegador web atualizado (Chrome, Firefox, Edge ou Safari)

### Procedimento de Login

1. Acesse o endereço: `https://admin.anunciargrajau.com.br`
2. Insira seu email e senha
3. Clique em "Entrar"

### Segurança

- Altere sua senha regularmente
- Nunca compartilhe suas credenciais
- Sempre encerre a sessão ao terminar de usar o sistema
- Ative a autenticação de dois fatores (2FA) para maior segurança

## Gerenciamento de Usuários

### Visualização de Usuários

1. No menu lateral, clique em "Usuários"
2. Use os filtros para encontrar usuários específicos:
   - Por papel (Usuário, Empresa, Profissional, Admin)
   - Por status (Ativo, Pendente, Rejeitado, Bloqueado)
   - Por nome ou email

### Edição de Usuários

1. Localize o usuário na lista
2. Clique no ícone de edição (lápis)
3. Modifique os campos necessários
4. Clique em "Salvar"

### Alteração de Permissões

1. Localize o usuário na lista
2. Clique no ícone de permissões (escudo)
3. Selecione o novo papel do usuário
4. Clique em "Atualizar Permissões"

**Importante**: Tenha cuidado ao conceder permissões de administrador.

### Bloqueio/Desbloqueio de Usuários

1. Localize o usuário na lista
2. Clique no ícone de status (círculo)
3. Selecione "Bloquear" ou "Desbloquear"
4. Informe o motivo da ação
5. Clique em "Confirmar"

## Aprovação de Empresas e Profissionais

### Visualização de Pendências

1. No menu lateral, clique em "Aprovações"
2. Selecione a aba "Empresas" ou "Profissionais"
3. Visualize a lista de cadastros pendentes

### Processo de Aprovação

1. Clique no nome da empresa/profissional para ver detalhes
2. Verifique as informações fornecidas:
   - Dados cadastrais
   - Documentos anexados
   - Informações de contato
3. Clique em "Aprovar" ou "Rejeitar"
4. Se rejeitar, informe o motivo
5. Clique em "Confirmar"

### Critérios de Aprovação

**Empresas:**
- CNPJ válido e verificável
- Endereço completo e correto
- Telefone e email de contato válidos
- Descrição adequada dos serviços

**Profissionais:**
- Documento de identificação válido
- Comprovação de qualificação profissional
- Endereço completo e correto
- Telefone e email de contato válidos

## Gerenciamento de Planos e Pagamentos

### Criação de Planos

1. No menu lateral, clique em "Planos"
2. Clique em "Novo Plano"
3. Preencha os campos:
   - Nome do plano
   - Descrição
   - Preço
   - Duração (em dias)
   - Tipo (Empresa, Profissional, Vaga)
   - Recursos incluídos
4. Clique em "Criar Plano"

### Edição de Planos

1. Localize o plano na lista
2. Clique no ícone de edição (lápis)
3. Modifique os campos necessários
4. Clique em "Salvar"

**Importante**: A edição de planos não afeta assinaturas existentes.

### Visualização de Pagamentos

1. No menu lateral, clique em "Pagamentos"
2. Use os filtros para encontrar pagamentos específicos:
   - Por status (Pendente, Pago, Falha, Reembolsado)
   - Por data
   - Por usuário

### Relatórios Financeiros

1. No menu lateral, clique em "Relatórios"
2. Selecione "Relatório Financeiro"
3. Defina o período desejado
4. Clique em "Gerar Relatório"
5. Opcionalmente, exporte para CSV ou PDF

## Gerenciamento do Blog

### Criação de Artigos

1. No menu lateral, clique em "Blog"
2. Clique em "Novo Artigo"
3. Preencha os campos:
   - Título
   - Conteúdo (editor rich text)
   - Categoria
   - Tags
   - Imagem destacada
4. Selecione "Publicar" ou "Salvar como rascunho"
5. Clique em "Salvar"

### Gerenciamento de Categorias

1. No menu lateral, clique em "Blog"
2. Selecione a aba "Categorias"
3. Para adicionar: clique em "Nova Categoria"
4. Para editar: clique no ícone de edição
5. Para excluir: clique no ícone de exclusão

### Moderação de Comentários

1. No menu lateral, clique em "Blog"
2. Selecione a aba "Comentários"
3. Visualize os comentários pendentes de moderação
4. Clique em "Aprovar" ou "Rejeitar"

## Monitoramento e Logs

### Visualização de Logs

1. No menu lateral, clique em "Logs"
2. Selecione o tipo de log:
   - Logs de sistema
   - Logs de acesso
   - Logs de auditoria
3. Use os filtros para refinar a busca:
   - Por data
   - Por nível (erro, aviso, info)
   - Por usuário

### Auditoria de Ações

1. No menu lateral, clique em "Auditoria"
2. Visualize as ações realizadas por administradores
3. Use os filtros para refinar a busca:
   - Por data
   - Por usuário
   - Por tipo de ação

### Monitoramento de Desempenho

1. No menu lateral, clique em "Dashboard"
2. Visualize os gráficos de desempenho:
   - Uso de CPU e memória
   - Tempo de resposta da API
   - Número de requisições
   - Taxa de erros

## Backup e Restauração

### Backup Manual

1. No menu lateral, clique em "Configurações"
2. Selecione a aba "Backup"
3. Clique em "Iniciar Backup Manual"
4. Aguarde a conclusão do processo
5. Clique em "Download" para salvar o arquivo

### Agendamento de Backups

1. No menu lateral, clique em "Configurações"
2. Selecione a aba "Backup"
3. Configure a frequência dos backups automáticos:
   - Diário
   - Semanal
   - Mensal
4. Defina o horário de execução
5. Clique em "Salvar Configurações"

### Restauração de Backup

1. No menu lateral, clique em "Configurações"
2. Selecione a aba "Backup"
3. Clique em "Restaurar Backup"
4. Selecione o arquivo de backup
5. Clique em "Iniciar Restauração"
6. Confirme a operação

**Atenção**: A restauração substituirá todos os dados atuais. Use com cautela.

## Configurações do Sistema

### Configurações Gerais

1. No menu lateral, clique em "Configurações"
2. Ajuste as configurações conforme necessário:
   - Nome do site
   - Email de contato
   - Limite de uploads
   - Configurações de cache

### Configurações de Email

1. No menu lateral, clique em "Configurações"
2. Selecione a aba "Email"
3. Configure os parâmetros do servidor SMTP:
   - Servidor
   - Porta
   - Usuário
   - Senha
   - Segurança (SSL/TLS)
4. Teste a configuração
5. Clique em "Salvar"

### Configurações de Pagamento

1. No menu lateral, clique em "Configurações"
2. Selecione a aba "Pagamento"
3. Configure os parâmetros do Mercado Pago:
   - Chave de API
   - Token de acesso
   - Ambiente (Sandbox/Produção)
4. Clique em "Salvar"

## Resolução de Problemas Comuns

### Problemas de Login

**Sintoma**: Usuários não conseguem fazer login.
**Solução**:
1. Verifique se o email está correto
2. Redefina a senha do usuário
3. Verifique se a conta não está bloqueada
4. Verifique os logs de autenticação

### Falhas de Pagamento

**Sintoma**: Pagamentos não estão sendo processados.
**Solução**:
1. Verifique a configuração do Mercado Pago
2. Verifique se o webhook está configurado corretamente
3. Verifique os logs de pagamento
4. Entre em contato com o suporte do Mercado Pago

### Lentidão no Sistema

**Sintoma**: Sistema está lento ou não responde.
**Solução**:
1. Verifique o uso de recursos do servidor
2. Verifique os logs de erro
3. Reinicie o serviço da API
4. Considere aumentar os recursos do servidor

### Erros de Upload

**Sintoma**: Usuários não conseguem fazer upload de arquivos.
**Solução**:
1. Verifique as permissões da pasta de uploads
2. Verifique o limite de tamanho de arquivo
3. Verifique se o tipo de arquivo é permitido
4. Verifique o espaço em disco disponível

---

Para suporte adicional, entre em contato com a equipe técnica pelo email: suporte@anunciargrajau.com.br 