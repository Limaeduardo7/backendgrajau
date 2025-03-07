import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Erro:', err);

  // Log detalhado para depuração
  console.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers,
  });

  // Erros da API
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errors: err.errors,
    });
  }

  // Erros de validação do Zod
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      message: 'Erro de validação',
      errors,
    });
  }

  // Erros do Prisma
  if (err instanceof PrismaClientKnownRequestError) {
    // Erro de chave única (P2002)
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[]) || ['unknown'];
      return res.status(409).json({
        message: 'Conflito de dados',
        errors: [
          {
            field: field.join('.'),
            message: `Já existe um registro com este valor de ${field.join('.')}`,
          },
        ],
      });
    }

    // Erro de registro não encontrado (P2025)
    if (err.code === 'P2025') {
      return res.status(404).json({
        message: 'Recurso não encontrado',
      });
    }

    // Erro de restrição de chave estrangeira (P2003)
    if (err.code === 'P2003') {
      return res.status(400).json({
        message: 'Erro de referência',
        errors: [
          {
            field: err.meta?.field_name as string || 'unknown',
            message: 'Referência inválida',
          },
        ],
      });
    }

    // Outros erros do Prisma
    return res.status(500).json({
      message: 'Erro de banco de dados',
    });
  }

  // Erro de validação do Prisma
  if (err instanceof PrismaClientValidationError) {
    return res.status(400).json({
      message: 'Erro de validação no banco de dados',
    });
  }

  // Erros de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Token inválido',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expirado',
    });
  }

  // Erros de multer (upload de arquivos)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: 'Erro no upload de arquivo',
      errors: [
        {
          field: 'file',
          message: err.message,
        },
      ],
    });
  }

  // Erro padrão para qualquer outro tipo de erro
  return res.status(500).json({
    message: 'Erro interno do servidor',
  });
}; 