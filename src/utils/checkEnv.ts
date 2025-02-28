/**
 * Utilitário para verificar se todas as variáveis de ambiente necessárias estão configuradas
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'MERCADO_PAGO_ACCESS_TOKEN',
  'API_URL',
  'FRONTEND_URL',
];

export function checkRequiredEnvVars(): void {
  const missingVars: string[] = [];

  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error('❌ Erro: As seguintes variáveis de ambiente são obrigatórias e não estão definidas:');
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPor favor, configure estas variáveis no arquivo .env');
    console.error('Você pode usar o arquivo .env.example como referência.');
    process.exit(1);
  }

  console.log('✅ Todas as variáveis de ambiente obrigatórias estão configuradas.');
}

export default checkRequiredEnvVars; 