import { clerkClient } from '@clerk/clerk-sdk-node';

// Verificar se a chave secreta do Clerk está configurada
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY não configurada');
}

// Exportar cliente do Clerk para uso em toda a aplicação
export default clerkClient;

// Exportar constantes do Clerk
export const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
export const PUBLIC_KEY = process.env.CLERK_PUBLIC_KEY
export const SECRET_KEY = process.env.CLERK_SECRET_KEY 