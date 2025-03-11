import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: Role;
    email?: string; // Campo opcional para compatibilidade com a interface Request
  };
}

export interface AuthUser {
  id: string;
  clerkId: string;
  role: Role;
  email?: string;
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