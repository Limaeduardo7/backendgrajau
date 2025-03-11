import { User, Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        clerkId: string;
        role: Role;
        email?: string;
      };
      auth?: {
        userId: string;
      };
    }
  }
}

export {}; 