import multer = require('multer');
import { Request } from 'express';
import { join } from 'path';
import { ApiError } from '../utils/ApiError';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Apenas imagens são permitidas'));
  }
};

const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
};

export const uploadMiddleware = (fieldName: string, maxCount: number) => {
  return multer({
    storage,
    fileFilter,
    limits,
  }).array(fieldName, maxCount);
}; 