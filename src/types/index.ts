import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: string;
    email?: string; // Agora opcional para compatibilidade com Request
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