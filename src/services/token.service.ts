import prisma from '../config/prisma';
import logger from '../config/logger';

interface RevokedToken {
  token: string;
  expiresAt: number;
}

class TokenService {
  private revokedTokens: Map<string, number> = new Map();
  
  // Adicionar token à lista de revogados
  async revokeToken(token: string, expiresIn: number = 24 * 60 * 60 * 1000): Promise<void> {
    const expiresAt = Date.now() + expiresIn;
    this.revokedTokens.set(token, expiresAt);
    
    logger.info(`Token revogado. Total de tokens revogados: ${this.revokedTokens.size}`);
    
    // Limpar tokens antigos periodicamente (a cada 10 revogações)
    if (this.revokedTokens.size % 10 === 0) {
      this.cleanupRevokedTokens();
    }
  }
  
  // Verificar se um token está revogado
  isTokenRevoked(token: string): boolean {
    if (!this.revokedTokens.has(token)) {
      return false;
    }
    
    const expiresAt = this.revokedTokens.get(token);
    
    // Se o token expirou, remover da lista e retornar false
    if (expiresAt && expiresAt < Date.now()) {
      this.revokedTokens.delete(token);
      return false;
    }
    
    return true;
  }
  
  // Limpar tokens revogados expirados
  private cleanupRevokedTokens(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [token, expiresAt] of this.revokedTokens.entries()) {
      if (expiresAt < now) {
        this.revokedTokens.delete(token);
        removedCount++;
      }
    }
    
    logger.info(`Limpeza de tokens revogados concluída. Removidos: ${removedCount}. Restantes: ${this.revokedTokens.size}`);
  }
  
  // Gerar um novo token no formato personalizado
  generateToken(userId: string, email: string, role: string): string {
    const payload = {
      userId,
      email,
      role,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
    };
    
    // Codificar o payload em base64
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    // Criar o token no formato esperado pelo frontend
    return `clerk_token_${base64Payload}`;
  }
}

export default new TokenService(); 