import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: string;
    email: string; // Mantendo email como requerido para compatibilidade
  };
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  url?: string;
  path?: string;
  error?: string;
} 