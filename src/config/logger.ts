import * as winston from 'winston';
import 'winston-daily-rotate-file';

// Configuração de níveis de log personalizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Escolher o nível de log com base no ambiente
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'http';
};

// Cores para cada nível de log
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Adicionar cores ao winston
winston.addColors(colors);

// Formato para logs de console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Formato para logs de arquivo
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json(),
);

// Transporte para logs de arquivo com rotação diária
const fileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
});

// Transporte para logs de erro com rotação diária
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
  format: fileFormat,
});

// Transporte para console
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

// Criar o logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports: [
    consoleTransport,
  ],
});

// Adicionar transportes de arquivo em produção
if (process.env.NODE_ENV === 'production') {
  logger.add(fileTransport);
  logger.add(errorFileTransport);
  
  // Remover logs de debug em produção
  logger.level = 'info';
}

// Função para registrar requisições HTTP
export const logRequest = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // Quando a resposta terminar
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    
    // Registrar como erro se for 4xx ou 5xx
    if (res.statusCode >= 400) {
      logger.error(message, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    } else {
      logger.http(message, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
      });
    }
  });
  
  next();
};

export default logger; 