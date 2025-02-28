#!/usr/bin/env node

/**
 * Script de verificação pré-deploy
 * 
 * Este script verifica se todas as condições necessárias para o deploy estão satisfeitas:
 * - Verifica se todas as variáveis de ambiente necessárias estão definidas
 * - Verifica se o build compila sem erros
 * - Verifica se os testes passam
 * - Verifica a conexão com o banco de dados
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

console.log('🔍 Iniciando verificação pré-deploy...');

// Array para armazenar erros
const errors = [];

// Função para executar comandos e capturar erros
function runCommand(command, errorMessage) {
  try {
    console.log(`\n📋 Executando: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ ${errorMessage}`);
    errors.push(errorMessage);
    return false;
  }
}

// Verificar variáveis de ambiente obrigatórias
console.log('\n🔑 Verificando variáveis de ambiente...');
const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'PORT',
  'NODE_ENV',
  'API_URL',
  'FRONTEND_URL',
  'MERCADO_PAGO_ACCESS_TOKEN',
  'RESEND_API_KEY',
  'EMAIL_FROM'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    const error = `Variável de ambiente ${envVar} não está definida`;
    console.error(`❌ ${error}`);
    errors.push(error);
  } else {
    console.log(`✅ ${envVar} está definida`);
  }
}

// Verificar se o TypeScript compila sem erros
console.log('\n🔧 Verificando compilação TypeScript...');
runCommand('npx tsc --noEmit', 'Compilação TypeScript falhou');

// Verificar se os testes passam
console.log('\n🧪 Executando testes...');
runCommand('npm test', 'Alguns testes falharam');

// Verificar conexão com o banco de dados
console.log('\n🗄️ Verificando conexão com o banco de dados...');
runCommand('npx prisma db pull --force', 'Não foi possível conectar ao banco de dados');

// Verificar se o build pode ser gerado
console.log('\n🏗️ Verificando build...');
runCommand('npm run build', 'Falha ao gerar o build');

// Verificar se o diretório dist foi criado e contém arquivos
if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
  const distFiles = fs.readdirSync(path.join(process.cwd(), 'dist'));
  if (distFiles.length === 0) {
    const error = 'O diretório dist está vazio após o build';
    console.error(`❌ ${error}`);
    errors.push(error);
  } else {
    console.log('✅ Diretório dist contém arquivos');
  }
} else {
  const error = 'O diretório dist não foi criado após o build';
  console.error(`❌ ${error}`);
  errors.push(error);
}

// Resumo final
console.log('\n📊 Resumo da verificação pré-deploy:');
if (errors.length === 0) {
  console.log('✅ Todas as verificações passaram! O sistema está pronto para deploy.');
  process.exit(0);
} else {
  console.error(`❌ Foram encontrados ${errors.length} problemas que precisam ser corrigidos antes do deploy:`);
  errors.forEach((error, index) => {
    console.error(`   ${index + 1}. ${error}`);
  });
  process.exit(1);
} 