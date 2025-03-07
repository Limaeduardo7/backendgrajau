import { clerkClient } from '@clerk/clerk-sdk-node'

// Verificar variáveis de ambiente necessárias
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY não está definida no arquivo .env')
}

if (!process.env.CLERK_WEBHOOK_SECRET) {
  throw new Error('CLERK_WEBHOOK_SECRET não está definida no arquivo .env')
}

// Exportar cliente do Clerk para uso em toda a aplicação
export const clerk = clerkClient

// Exportar constantes do Clerk
export const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
export const PUBLIC_KEY = process.env.CLERK_PUBLIC_KEY
export const SECRET_KEY = process.env.CLERK_SECRET_KEY 