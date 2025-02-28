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
  name: z.string({
    required_error: 'Nome é obrigatório',
    invalid_type_error: 'Nome deve ser uma string',
  }).min(3, 'Nome deve ter pelo menos 3 caracteres'),
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
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
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
      return res.status(400).json({
        error: error.errors[0].message,
        errors: error.errors,
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