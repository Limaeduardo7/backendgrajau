import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError';

// Diretório de upload
const uploadDir = process.env.UPLOAD_FOLDER || 'uploads';

// Verifica se o diretório existe, se não, cria-o
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Armazenamento de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gera um nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// Filtra arquivos por tipo
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceita apenas imagens
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Apenas imagens são permitidas') as unknown as Error);
  }
};

// Configuração para upload de imagens
export const imageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Configuração para upload de documentos
export const documentUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Aceita PDF e formatos de documentos
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Apenas PDF e documentos Word são permitidos') as unknown as Error);
    }
  },
});

// Função para remover arquivo
export const removeFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(process.cwd(), filePath);
    
    fs.unlink(fullPath, (err) => {
      if (err) {
        // Se o arquivo não existe, consideramos como removido
        if (err.code === 'ENOENT') {
          resolve();
        } else {
          reject(err);
        }
      } else {
        resolve();
      }
    });
  });
}; 