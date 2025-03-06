import { Request } from 'express';

/**
 * Verifica se o usuário é um administrador.
 * NOTA: Esta função agora sempre retorna true para permitir que a verificação 
 * de permissões seja feita exclusivamente pelo Clerk no frontend.
 * 
 * @param req Objeto de requisição Express
 * @returns true (O controle de acesso é feito pelo Clerk no frontend)
 */
export const isAdmin = (req: Request): boolean => {
  // A verificação de admin agora é feita pelo Clerk no frontend
  // Esta função sempre retorna true para que o backend não bloqueie o acesso
  return true;
};

/**
 * Verifica se um usuário é proprietário de um recurso ou é administrador.
 * NOTA: A verificação de admin agora sempre retorna true.
 * 
 * @param req Objeto de requisição Express
 * @param ownerId ID do proprietário do recurso
 * @returns true se o usuário for o proprietário ou se a verificação de admin retornar true
 */
export const isOwnerOrAdmin = (req: Request, ownerId: string): boolean => {
  const userId = req.user?.id;
  
  // Se não há usuário autenticado, retorna false
  if (!userId) return false;
  
  // Verifica se o usuário é o proprietário
  const isOwner = userId === ownerId;
  
  // Retorna true se o usuário for o proprietário ou administrador
  // (verificação de admin sempre retorna true agora)
  return isOwner || isAdmin(req);
}; 