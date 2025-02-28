# Guia de Deploy na VPS da Hostinger

Este guia descreve os passos necessários para fazer o deploy do backend do Anunciar Grajaú em uma VPS da Hostinger.

## Pré-requisitos

- Acesso SSH à VPS da Hostinger
- Node.js (versão 16 ou superior) instalado na VPS
- PostgreSQL instalado na VPS ou acesso a um banco de dados PostgreSQL remoto
- Git instalado na VPS

## Passos para o Deploy

### 1. Conectar à VPS via SSH

```bash
ssh usuario@seu-ip-da-vps
```

### 2. Atualizar o sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### 3. Instalar dependências necessárias

```bash
sudo apt install -y curl git build-essential
```

### 4. Instalar Node.js (se ainda não estiver instalado)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifique a instalação:

```bash
node -v
npm -v
```

### 5. Instalar PM2 (gerenciador de processos para Node.js)

```bash
sudo npm install -g pm2
```

### 6. Configurar o PostgreSQL (se for usar localmente)

```bash
sudo apt install -y postgresql postgresql-contrib
```

Criar um usuário e banco de dados:

```bash
sudo -u postgres psql
```

No prompt do PostgreSQL:

```sql
CREATE USER anunciar_grajau WITH PASSWORD 'sua_senha_segura';
CREATE DATABASE anunciar_grajau;
GRANT ALL PRIVILEGES ON DATABASE anunciar_grajau TO anunciar_grajau;
\q
```

### 7. Clonar o repositório

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/seu-usuario/anunciar-grajau-backend.git
cd anunciar-grajau-backend
```

### 8. Instalar dependências do projeto

```bash
npm install
```

### 9. Configurar variáveis de ambiente

Crie o arquivo .env:

```bash
cp .env.example .env
nano .env
```

Configure as variáveis de ambiente necessárias:

```
# Banco de dados
DATABASE_URL="postgresql://anunciar_grajau:sua_senha_segura@localhost:5432/anunciar_grajau"
DIRECT_URL="postgresql://anunciar_grajau:sua_senha_segura@localhost:5432/anunciar_grajau"

# Aplicação
PORT=3000
NODE_ENV="production"
API_URL="https://api.anunciargrajau.com.br"
FRONTEND_URL="https://anunciargrajau.com.br"

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN="seu-token-mercado-pago"
MERCADO_PAGO_PUBLIC_KEY="sua-chave-publica-mercado-pago"

# Email
RESEND_API_KEY="sua-chave-api-resend"
EMAIL_FROM="no-reply@anunciargrajau.com.br"

# Segurança
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Monitoramento
SENTRY_DSN="sua-dsn-do-sentry"
ENABLE_PERFORMANCE_MONITORING=true

# Logging
LOG_LEVEL="info"
LOG_RETENTION_DAYS=14

# Backup
BACKUP_ENABLED=true
BACKUP_FREQUENCY="daily"
BACKUP_TIME="03:00"
BACKUP_RETENTION_DAYS=7

# AWS (para backups no S3)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="sua-access-key"
AWS_SECRET_ACCESS_KEY="sua-secret-key"
S3_BACKUP_BUCKET="nome-do-bucket-de-backup"
```

### 10. Gerar o cliente Prisma e executar migrações

```bash
npx prisma generate
npx prisma migrate deploy
```

### 11. Compilar o projeto TypeScript

```bash
npm run build
```

### 12. Configurar PM2 para gerenciar a aplicação

Crie um arquivo de configuração para o PM2:

```bash
nano ecosystem.config.js
```

Adicione o seguinte conteúdo:

```javascript
module.exports = {
  apps: [
    {
      name: "anunciar-grajau-api",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

### 13. Iniciar a aplicação com PM2

```bash
pm2 start ecosystem.config.js
```

### 14. Configurar PM2 para iniciar automaticamente após reinicialização do servidor

```bash
pm2 startup
pm2 save
```

### 15. Configurar Nginx como proxy reverso

Instalar Nginx:

```bash
sudo apt install -y nginx
```

Configurar o site:

```bash
sudo nano /etc/nginx/sites-available/anunciar-grajau-api
```

Adicione a seguinte configuração:

```nginx
server {
    listen 80;
    server_name api.anunciargrajau.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ativar o site:

```bash
sudo ln -s /etc/nginx/sites-available/anunciar-grajau-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 16. Configurar HTTPS com Certbot

Instalar Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Obter certificado SSL:

```bash
sudo certbot --nginx -d api.anunciargrajau.com.br
```

### 17. Configurar backup automático

Certifique-se de que as variáveis de ambiente para backup estão configuradas corretamente no arquivo .env.

Adicione o script de backup ao crontab:

```bash
crontab -e
```

Adicione a seguinte linha para executar o backup diariamente às 3h da manhã:

```
0 3 * * * cd /var/www/anunciar-grajau-backend && /usr/bin/node scripts/backup.js --s3 >> /var/log/anunciar-grajau-backup.log 2>&1
```

### 18. Monitoramento da aplicação

Você pode monitorar a aplicação usando o PM2:

```bash
pm2 monit
pm2 logs
```

## Atualizações futuras

Para atualizar a aplicação no futuro:

```bash
cd /var/www/anunciar-grajau-backend
git pull
npm install
npx prisma generate
npm run build
pm2 restart anunciar-grajau-api
```

## Solução de problemas

### Verificar logs da aplicação

```bash
pm2 logs anunciar-grajau-api
```

### Verificar logs do Nginx

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Reiniciar serviços

```bash
pm2 restart anunciar-grajau-api
sudo systemctl restart nginx
``` 