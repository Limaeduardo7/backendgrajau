#!/usr/bin/env node

/**
 * Script de transpilação TypeScript
 * Este script transpila os arquivos TypeScript para JavaScript ignorando erros de tipo
 * Use apenas para implantação de emergência quando há erros de tipo que precisam ser corrigidos depois
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Iniciando transpilação TypeScript (ignorando erros de tipo)...');

try {
  // Criar ou atualizar um arquivo tsconfig.transpile.json específico para transpilação
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.transpile.json');
  
  const tsconfig = {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "noEmit": false,
      "skipLibCheck": true,
      "noImplicitAny": false,
      "strictNullChecks": false,
      "strictPropertyInitialization": false,
      "suppressImplicitAnyIndexErrors": true,
      "ignoreDeprecations": "5.0"
    }
  };
  
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  console.log('✅ Arquivo tsconfig.transpile.json criado');
  
  // Executar a transpilação usando o arquivo temporário
  console.log('🔨 Transpilando TypeScript para JavaScript...');
  execSync('npx tsc --project tsconfig.transpile.json', { stdio: 'inherit' });
  
  console.log('✅ Transpilação concluída com sucesso!');
  process.exit(0);
} catch (error) {
  console.error('❌ Erro durante a transpilação:', error.message);
  process.exit(1);
} 