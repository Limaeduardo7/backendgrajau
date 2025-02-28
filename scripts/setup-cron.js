#!/usr/bin/env node

/**
 * Script para configurar o cron job de backup
 * 
 * Este script configura um cron job para executar o backup do banco de dados
 * automaticamente de acordo com a frequência configurada.
 * 
 * Uso:
 * - node setup-cron.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Verificar se o backup está habilitado
const backupEnabled = process.env.BACKUP_ENABLED === 'true';
if (!backupEnabled) {
  console.log('Backup automático desabilitado. Saindo...');
  process.exit(0);
}

// Configurações
const backupFrequency = process.env.BACKUP_FREQUENCY || 'daily';
const backupTime = process.env.BACKUP_TIME || '03:00';
const useS3 = process.env.S3_BACKUP_BUCKET ? ' --s3' : '';

// Extrair hora e minuto
const [hour, minute] = backupTime.split(':').map(Number);

// Construir expressão cron
let cronExpression;
switch (backupFrequency) {
  case 'hourly':
    cronExpression = `${minute} * * * *`;
    break;
  case 'daily':
    cronExpression = `${minute} ${hour} * * *`;
    break;
  case 'weekly':
    cronExpression = `${minute} ${hour} * * 0`; // Domingo
    break;
  case 'monthly':
    cronExpression = `${minute} ${hour} 1 * *`; // Primeiro dia do mês
    break;
  default:
    cronExpression = `${minute} ${hour} * * *`; // Diário por padrão
}

// Caminho do script de backup
const backupScript = path.resolve(__dirname, 'backup.js');

// Comando crontab
const crontabCommand = `(crontab -l 2>/dev/null || echo "") | grep -v "${backupScript}" | echo "${cronExpression} node ${backupScript}${useS3} >> ${path.resolve(__dirname, '../logs/backup.log')} 2>&1" | crontab -`;

console.log(`Configurando cron job para backup ${backupFrequency} às ${backupTime}...`);
console.log(`Expressão cron: ${cronExpression}`);

// Executar comando
exec(crontabCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Erro ao configurar cron job: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Erro no crontab: ${stderr}`);
    return;
  }
  
  console.log('Cron job configurado com sucesso!');
  
  // Verificar crontab atual
  exec('crontab -l', (err, out) => {
    if (err) {
      console.error(`Erro ao listar crontab: ${err.message}`);
      return;
    }
    
    console.log('Crontab atual:');
    console.log(out || 'Nenhum cron job configurado');
  });
}); 