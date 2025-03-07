import prisma from '../config/prisma';
import logger from '../config/logger';
import { Status } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as https from 'https';

// Cache para as chaves públicas do Clerk
let jwksCache: any = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600000; // 1 hora

// Configuração da URL do conjunto de chaves JWKS do Clerk
const CLERK_ISSUER = process.env.CLERK_ISSUER || 'https://clerk.anunciargrajaueregiao.com';
const CLERK_JWKS_URL = `${CLERK_ISSUER}/.well-known/jwks.json`;

// Função para fazer uma requisição HTTP GET
function httpsGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Erro ao fazer parse da resposta JSON'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Função para obter as chaves JWKS do Clerk
async function getJwks() {
  // Verificar se o cache ainda é válido
  if (jwksCache && (Date.now() - jwksCacheTime < JWKS_CACHE_TTL)) {
    return jwksCache;
  }

  try {
    const data = await httpsGet(CLERK_JWKS_URL);
    jwksCache = data;
    jwksCacheTime = Date.now();
    return jwksCache;
  } catch (error) {
    logger.error('Erro ao buscar JWKS do Clerk:', error);
    throw new Error('Não foi possível obter as chaves de verificação');
  }
}

// Função para encontrar a chave pública correta para verificar o token
function findKey(jwks: any, kid: string) {
  const keys = jwks.keys.filter((key: any) => key.kid === kid);
  return keys[0];
}

/**
 * Verifica um JWT emitido pelo Clerk
 * @param token JWT a ser verificado
 * @returns Dados do usuário autenticado
 */
export async function verifyClerkJWT(token: string) {
  try {
    // Decodificar o cabeçalho do token para obter o kid
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Formato de token inválido');
    }
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const kid = header.kid;
    
    if (!kid) {
      throw new Error('Token sem kid no cabeçalho');
    }
    
    // Obter as chaves JWKS
    const jwks = await getJwks();
    const key = findKey(jwks, kid);
    
    if (!key) {
      throw new Error('Chave de verificação não encontrada');
    }
    
    // Verificar o token manualmente (sem usar jose)
    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ['RS256'] as jwt.Algorithm[],
      issuer: CLERK_ISSUER,
      audience: process.env.CLERK_JWT_AUDIENCE || process.env.CLERK_PUBLIC_KEY
    };
    
    // Formato da chave pública PEM
    const pemKey = `-----BEGIN PUBLIC KEY-----\n${key.x5c[0]}\n-----END PUBLIC KEY-----`;
    
    // Verificar o token
    const payload: any = jwt.verify(token, pemKey, verifyOptions);
    
    if (!payload.sub) {
      logger.warn('JWT do Clerk sem subject (sub)');
      throw new Error('Token inválido');
    }
    
    // Extrair dados do payload
    const clerkUserId = payload.sub as string;
    const email = payload.email as string || '';
    
    // Buscar usuário no banco local
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId }
    });
    
    // Se não encontrou, tentar por email
    if (!user && email) {
      user = await prisma.user.findUnique({
        where: { email }
      });
      
      // Se encontrou por email mas clerkId não bate, atualizar
      if (user && user.clerkId !== clerkUserId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { clerkId: clerkUserId }
        });
        logger.info(`ClerkId atualizado para usuário ${user.id}`);
      }
    }
    
    // Se ainda não encontrou, criar novo usuário
    if (!user) {
      // Obter nome do payload se disponível
      const firstName = payload.firstName as string || '';
      const lastName = payload.lastName as string || '';
      const name = payload.name as string || `${firstName} ${lastName}`.trim() || email.split('@')[0];
      
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          name,
          email,
          role: 'USER',
          status: 'PENDING',
        }
      });
      
      logger.info(`Novo usuário criado via JWT Clerk: ${user.id}`);
    }
    
    // Verificar se o usuário está ativo
    if (user.status !== Status.APPROVED && user.status !== Status.PENDING) {
      logger.warn(`Tentativa de acesso com usuário inativo: ${user.id}`);
      throw new Error('Usuário inativo');
    }
    
    logger.info(`Autenticação via JWT bem-sucedida para usuário ${user.id}`);
    
    return {
      userId: user.id,
      clerkId: user.clerkId,
      role: user.role,
      email: user.email
    };
  } catch (error) {
    logger.error('Erro ao verificar JWT do Clerk:', error);
    throw new Error('Falha na autenticação');
  }
}

/**
 * Busca ou cria um usuário pelo ID do Clerk
 */
export async function findOrCreateUserByClerkId(clerkId: string, email: string, metadata?: any) {
  try {
    // Buscar usuário pelo clerkId
    let user = await prisma.user.findUnique({
      where: { clerkId }
    });
    
    // Se não encontrou, tentar por email
    if (!user && email) {
      user = await prisma.user.findUnique({
        where: { email }
      });
      
      // Se encontrou por email mas clerkId não bate, atualizar
      if (user && user.clerkId !== clerkId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { clerkId }
        });
      }
    }
    
    // Se ainda não encontrou, criar novo usuário
    if (!user) {
      const name = metadata?.name || email.split('@')[0];
      
      user = await prisma.user.create({
        data: {
          clerkId,
          name,
          email,
          role: 'USER',
          status: 'PENDING',
        }
      });
      
      logger.info(`Novo usuário criado: ${user.id}`);
    }
    
    return user;
  } catch (error) {
    logger.error('Erro ao buscar/criar usuário:', error);
    throw error;
  }
} 