/**
 * Utilitário para implementar mecanismo de retry para chamadas de API
 */

/**
 * Função para realizar uma chamada de API com mecanismo de retry
 * @param fetchFn Função que realiza a chamada de API
 * @param maxRetries Número máximo de tentativas
 * @param delay Tempo de espera entre tentativas (em ms)
 * @param backoffFactor Fator de multiplicação para o tempo de espera entre tentativas
 * @returns Resultado da chamada de API
 */
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<Response>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoffFactor: number = 2
): Promise<T> {
  let lastError: any;
  let currentDelay = delay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn();
      
      // Se a resposta não for ok (status 200-299), lança um erro
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(`Status ${response.status}: ${(errorData as any).message || 'Erro desconhecido'}`);
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`Tentativa ${attempt + 1}/${maxRetries + 1} falhou:`, error);
      lastError = error;
      
      // Se for a última tentativa, lança o erro
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Aguarda antes da próxima tentativa com backoff exponencial
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
    }
  }

  // Este ponto nunca deve ser alcançado, mas é necessário para o TypeScript
  throw lastError;
}

/**
 * Função para realizar uma chamada de API com mecanismo de retry e fallback
 * @param fetchFn Função que realiza a chamada de API
 * @param fallbackData Dados de fallback para retornar em caso de falha
 * @param maxRetries Número máximo de tentativas
 * @param delay Tempo de espera entre tentativas (em ms)
 * @param backoffFactor Fator de multiplicação para o tempo de espera entre tentativas
 * @returns Resultado da chamada de API ou dados de fallback
 */
export async function fetchWithRetryAndFallback<T>(
  fetchFn: () => Promise<Response>,
  fallbackData: T,
  maxRetries: number = 3,
  delay: number = 1000,
  backoffFactor: number = 2
): Promise<T> {
  try {
    return await fetchWithRetry<T>(fetchFn, maxRetries, delay, backoffFactor);
  } catch (error) {
    console.error('Todas as tentativas falharam, usando dados de fallback:', error);
    return fallbackData;
  }
} 