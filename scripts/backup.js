#!/usr/bin/env node

/**
 * Script para backup automático do banco de dados
 * 
 * Este script realiza um backup do banco de dados PostgreSQL e o armazena
 * em um diretório local ou em um bucket S3, dependendo da configuração.
 * 
 * Uso:
 * - Backup local: node backup.js
 * - Backup para S3: node backup.js --s3
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configurações
const DB_URL = process.env.DATABASE_URL;
const BACKUP_DIR = path.resolve(__dirname, '../backups');
const S3_BUCKET = process.env.S3_BACKUP_BUCKET;
const S3_REGION = process.env.AWS_REGION || 'us-east-1';
const USE_S3 = process.argv.includes('--s3') && S3_BUCKET;

// Extrair informações de conexão do banco de dados
const dbUrlRegex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
const match = DB_URL.match(dbUrlRegex);

if (!match) {
  console.error('Erro: URL do banco de dados inválida');
  process.exit(1);
}

const [, username, password, host, port, database] = match;

// Criar diretório de backup se não existir
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Nome do arquivo de backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `backup-${database}-${timestamp}.sql`;
const filepath = path.join(BACKUP_DIR, filename);

// Comando pg_dump
const pgDumpCmd = `PGPASSWORD=${password} pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p > ${filepath}`;

console.log(`Iniciando backup do banco de dados ${database}...`);

// Executar pg_dump
exec(pgDumpCmd, async (error, stdout, stderr) => {
  if (error) {
    console.error(`Erro ao executar pg_dump: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Erro no pg_dump: ${stderr}`);
    return;
  }
  
  console.log(`Backup salvo em: ${filepath}`);
  
  // Enviar para S3 se configurado
  if (USE_S3) {
    try {
      await uploadToS3(filepath, filename);
      console.log(`Backup enviado para S3: ${S3_BUCKET}/${filename}`);
    } catch (err) {
      console.error(`Erro ao enviar para S3: ${err.message}`);
    }
  }
  
  // Limpar backups antigos (manter apenas os últimos 7 dias)
  cleanupOldBackups();
});

/**
 * Envia o arquivo de backup para o S3
 */
async function uploadToS3(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  
  const s3Client = new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
  const params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Body: fileContent,
  };
  
  const command = new PutObjectCommand(params);
  return s3Client.send(command);
}

/**
 * Remove backups com mais de 7 dias
 */
function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR);
  const now = new Date();
  
  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24); // idade em dias
    
    if (fileAge > 7) {
      fs.unlinkSync(filePath);
      console.log(`Backup antigo removido: ${file}`);
    }
  });
} 