import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';

/**
 * Sanitiza os dados de entrada para prevenir XSS e outros ataques
 */
export const sanitizeData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Sanitiza um objeto recursivamente
 */
const sanitizeObject = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Se for um array, sanitiza cada elemento
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  // Se for um objeto, sanitiza cada propriedade
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      // Sanitiza strings para prevenir XSS
      if (typeof value === 'string') {
        result[key] = sanitizeHtml(value, {
          allowedTags: [], // Não permite nenhuma tag HTML
          allowedAttributes: {}, // Não permite nenhum atributo
          disallowedTagsMode: 'recursiveEscape', // Escapa tags não permitidas
        });
      } else if (typeof value === 'object' && value !== null) {
        // Sanitiza objetos aninhados
        result[key] = sanitizeObject(value);
      } else {
        // Mantém outros tipos de dados inalterados
        result[key] = value;
      }
    }
  }

  return result;
}; 