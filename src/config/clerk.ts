import { clerkClient } from '@clerk/clerk-sdk-node'
import { Request, Response, NextFunction } from 'express'
import logger from './logger'

export const clerk = clerkClient

export const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || ''

export const PUBLIC_KEY = process.env.CLERK_PUBLIC_KEY || ''

export const SECRET_KEY = process.env.CLERK_SECRET_KEY || ''

if (!WEBHOOK_SECRET) {
  throw new Error('Missing CLERK_WEBHOOK_SECRET')
}

if (!PUBLIC_KEY) {
  throw new Error('Missing CLERK_PUBLIC_KEY')
}

if (!SECRET_KEY) {
  logger.error('CLERK_SECRET_KEY não está definida no arquivo .env')
  process.exit(1)
}

// Função para verificar token JWT do Clerk
export const verifyClerkToken = async (token: string) => {
  try {
    // Verificar o token com a API do Clerk
    const { sub, sid } = await clerkClient.verifyToken(token)
    
    if (!sub) {
      throw new Error('Token inválido')
    }
    
    // Buscar usuário pelo ID do Clerk
    const user = await clerkClient.users.getUser(sub)
    
    if (!user) {
      throw new Error('Usuário não encontrado')
    }
    
    // Extrair metadados públicos (incluindo role)
    const role = user.publicMetadata?.role as string || 'user'
    const email = user.emailAddresses[0]?.emailAddress
    
    return {
      clerkId: user.id,
      role,
      email
    }
  } catch (error) {
    logger.error('Erro ao verificar token Clerk:', error)
    throw new Error('Falha na autenticação')
  }
}

// Função para extrair token do cabeçalho Authorization
export const extractTokenFromHeader = (req: Request) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  return authHeader.split(' ')[1]
}

export default clerkClient 