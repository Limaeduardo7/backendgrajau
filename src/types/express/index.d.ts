import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        clerkId: string;
        role: string;
      };
      auth?: {
        userId: string;
      };
    }
  }
}

export {}; 