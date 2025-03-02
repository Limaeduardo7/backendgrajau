import logger from '../config/logger';

/**
 * Interface para as opções do mecanismo de retry
 */
interface RetryOptions {
  /** Número máximo de tentativas */
  maxRetries: number;
  /** Tempo de espera inicial entre tentativas (em ms) */
  initialDelay: number;
  /** Fator de backoff para aumentar o tempo de espera entre tentativas */
  backoffFactor: number;
  /** Lista de códigos de erro que devem ser considerados para retry */
  retryableErrors?: string[];
  /** Função para verificar se um erro específico deve ser considerado para retry */
  shouldRetry?: (error: any) => boolean;
  /** Função para executar antes de cada nova tentativa */
  onRetry?: (error: any, attempt: number) => void;
}

/**
 * Função para executar uma operação com mecanismo de retry
 * @param operation Função assíncrona que será executada com retry
 * @param options Opções de configuração do mecanismo de retry
 * @returns Resultado da operação
 * @throws Erro da última tentativa caso todas falhem
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  // Configurações padrão
  const config: RetryOptions = {
    maxRetries: options.maxRetries ?? 3,
    initialDelay: options.initialDelay ?? 1000,
    backoffFactor: options.backoffFactor ?? 2,
    retryableErrors: options.retryableErrors,
    shouldRetry: options.shouldRetry,
    onRetry: options.onRetry,
  };

  let lastError: any;
  let delay = config.initialDelay;

  // Tenta executar a operação até o número máximo de tentativas
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Executa a operação
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Se for a última tentativa, lança o erro
      if (attempt === config.maxRetries) {
        logger.error(`Todas as ${config.maxRetries + 1} tentativas falharam. Último erro: ${error.message}`);
        throw error;
      }

      // Verifica se o erro é retryable
      const isRetryable = shouldRetryError(error, config);
      
      if (!isRetryable) {
        logger.warn(`Erro não é retryable. Abortando tentativas: ${error.message}`);
        throw error;
      }

      // Executa o callback onRetry, se existir
      if (config.onRetry) {
        config.onRetry(error, attempt + 1);
      }

      // Loga a falha e a próxima tentativa
      logger.warn(`Tentativa ${attempt + 1}/${config.maxRetries + 1} falhou: ${error.message}. Tentando novamente em ${delay}ms...`);
      
      // Espera antes da próxima tentativa
      await sleep(delay);
      
      // Aumenta o tempo de espera para a próxima tentativa (backoff exponencial)
      delay *= config.backoffFactor;
    }
  }

  // Este ponto nunca deve ser alcançado, mas é necessário para o TypeScript
  throw lastError;
}

/**
 * Verifica se um erro deve ser considerado para retry
 * @param error Erro a ser verificado
 * @param options Opções de configuração do mecanismo de retry
 * @returns true se o erro deve ser considerado para retry, false caso contrário
 */
function shouldRetryError(error: any, options: RetryOptions): boolean {
  // Se houver uma função personalizada para verificar, usa ela
  if (options.shouldRetry) {
    return options.shouldRetry(error);
  }

  // Se houver uma lista de códigos de erro retryable, verifica se o erro está na lista
  if (options.retryableErrors && error.code) {
    return options.retryableErrors.includes(error.code);
  }

  // Por padrão, considera erros de conexão, timeout e erros temporários de banco de dados
  const errorMessage = error.message?.toLowerCase() || '';
  return (
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('deadlock') ||
    errorMessage.includes('too many connections') ||
    errorMessage.includes('temporarily unavailable') ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'P1001' || // Prisma: Database connection error
    error.code === 'P1008' || // Prisma: Operation timeout
    error.code === 'P1017'    // Prisma: Server closed the connection
  );
}

/**
 * Função para esperar um determinado tempo
 * @param ms Tempo em milissegundos
 * @returns Promise que resolve após o tempo especificado
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 