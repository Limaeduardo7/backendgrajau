#!/bin/bash

# Script de deploy para o backend do Anunciar Grajaú
# Uso: ./deploy.sh [ambiente]
# Exemplo: ./deploy.sh production

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para exibir mensagens
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERRO:${NC} $1"
}

success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCESSO:${NC} $1"
}

warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] AVISO:${NC} $1"
}

# Verificar se o ambiente foi especificado
ENVIRONMENT=${1:-production}
log "Iniciando deploy para o ambiente: ${ENVIRONMENT}"

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "package.json" ]; then
  error "Este script deve ser executado no diretório raiz do projeto"
  exit 1
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
  error "Node.js não está instalado"
  exit 1
fi

# Verificar se o PM2 está instalado
if ! command -v pm2 &> /dev/null; then
  warning "PM2 não está instalado. Instalando..."
  npm install -g pm2
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
  error "Arquivo .env não encontrado. Crie o arquivo .env antes de continuar."
  exit 1
fi

# Executar verificação pré-deploy
log "Executando verificação pré-deploy..."
if ! node scripts/pre-deploy-check.js; then
  error "Verificação pré-deploy falhou. Corrija os erros antes de continuar."
  exit 1
fi

# Fazer backup do banco de dados
log "Fazendo backup do banco de dados..."
npm run backup:s3

# Atualizar dependências
log "Atualizando dependências..."
npm install

# Gerar cliente Prisma
log "Gerando cliente Prisma..."
npx prisma generate

# Executar migrações do banco de dados
log "Executando migrações do banco de dados..."
npx prisma migrate deploy

# Compilar o projeto
log "Compilando o projeto..."
npm run build

# Verificar se a compilação foi bem-sucedida
if [ ! -d "dist" ]; then
  error "Compilação falhou. O diretório 'dist' não foi criado."
  exit 1
fi

# Verificar se o PM2 já está executando a aplicação
if pm2 list | grep -q "anunciar-grajau-api"; then
  log "Reiniciando aplicação com PM2..."
  pm2 restart anunciar-grajau-api
else
  log "Iniciando aplicação com PM2..."
  pm2 start ecosystem.config.js
fi

# Salvar configuração do PM2
log "Salvando configuração do PM2..."
pm2 save

# Exibir status da aplicação
log "Status da aplicação:"
pm2 status anunciar-grajau-api

success "Deploy concluído com sucesso!"
log "A API está disponível em: https://api.anunciargrajau.com.br"
log "Documentação da API: https://api.anunciargrajau.com.br/api-docs"

exit 0 