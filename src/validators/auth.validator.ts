import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Esquema para validação de login
const loginSchema = z.object({
  token: z.string({
    required_error: 'Token é obrigatório',
    invalid_type_error: 'Token deve ser uma string',
  }).min(1, 'Token não pode ser vazio'),
});

// Esquema para validação de registro
const registerSchema = z.object({
  firstName: z.string({
    required_error: 'Nome é obrigatório',
    invalid_type_error: 'Nome deve ser uma string',
  }).min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastName: z.string({
    required_error: 'Sobrenome é obrigatório',
    invalid_type_error: 'Sobrenome deve ser uma string',
  }).min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string({
    required_error: 'Email é obrigatório',
    invalid_type_error: 'Email deve ser uma string',
  }).email('Email inválido'),
  password: z.string({
    required_error: 'Senha é obrigatória',
    invalid_type_error: 'Senha deve ser uma string',
  }).min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  confirmPassword: z.string({
    required_error: 'Confirmação de senha é obrigatória',
    invalid_type_error: 'Confirmação de senha deve ser uma string',
  }).optional(),
}).transform(data => {
  // Se confirmPassword não estiver definido, use o valor de password
  if (!data.confirmPassword) {
    return {
      ...data,
      confirmPassword: data.password
    };
  }
  return data;
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword']
});

// Esquema para validação de redefinição de senha
const resetPasswordSchema = z.object({
  token: z.string({
    required_error: 'Token é obrigatório',
    invalid_type_error: 'Token deve ser uma string',
  }).min(1, 'Token não pode ser vazio'),
  password: z.string({
    required_error: 'Senha é obrigatória',
    invalid_type_error: 'Senha deve ser uma string',
  }).min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  confirmPassword: z.string({
    required_error: 'Confirmação de senha é obrigatória',
    invalid_type_error: 'Confirmação de senha deve ser uma string',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

// Esquema para validação de solicitação de redefinição de senha
const forgotPasswordSchema = z.object({
  email: z.string({
    required_error: 'Email é obrigatório',
    invalid_type_error: 'Email deve ser uma string',
  }).email('Email inválido'),
});

// Middleware para validação de login
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  try {
    loginSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.errors[0].message,
        errors: error.errors,
      });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para validação de registro
export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  try {
    registerSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Verificar se o erro é por campos faltando
      const missingFields = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path[0]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'Erro de validação',
          message: 'missing data',
          details: `Campos obrigatórios não fornecidos: ${missingFields.join(', ')}`,
          missingFields
        });
      }

      // Outros tipos de erros de validação
      return res.status(400).json({
        error: 'Erro de validação',
        message: error.errors[0].message,
        details: error.errors
      });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para validação de redefinição de senha
export const validateResetPassword = (req: Request, res: Response, next: NextFunction) => {
  try {
    resetPasswordSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.errors[0].message,
        errors: error.errors,
      });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para validação de solicitação de redefinição de senha
export const validateForgotPassword = (req: Request, res: Response, next: NextFunction) => {
  try {
    forgotPasswordSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.errors[0].message,
        errors: error.errors,
      });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 