export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  statusCode: number;
  errors?: ApiErrorDetail[];
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    errors?: ApiErrorDetail[] | any,
    isOperational = true,
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Requisição inválida', errors?: ApiErrorDetail[]) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Não autorizado', errors?: ApiErrorDetail[]) {
    super(401, message, errors);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Acesso negado', errors?: ApiErrorDetail[]) {
    super(403, message, errors);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Recurso não encontrado', errors?: ApiErrorDetail[]) {
    super(404, message, errors);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflito de dados', errors?: ApiErrorDetail[]) {
    super(409, message, errors);
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Erro de validação', errors?: ApiErrorDetail[]) {
    super(422, message, errors);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Erro interno do servidor', errors?: ApiErrorDetail[]) {
    super(500, message, errors, false);
  }
} 