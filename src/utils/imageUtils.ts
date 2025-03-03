import { getPlaceholderImage } from '../config/constants';

/**
 * Verifica se uma URL de imagem é válida
 * @param url URL da imagem a ser verificada
 * @returns Promise que resolve para true se a imagem for válida, false caso contrário
 */
export const isImageValid = async (url: string): Promise<boolean> => {
  if (!url) return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar imagem:', error);
    return false;
  }
};

/**
 * Retorna uma URL de imagem fallback se a imagem original falhar
 * @param imageUrl URL da imagem original
 * @param width Largura da imagem fallback
 * @param height Altura da imagem fallback
 * @param text Texto opcional para exibir na imagem fallback
 * @returns URL da imagem original ou do fallback
 */
export const getImageWithFallback = async (
  imageUrl: string | undefined | null,
  width: number = 150,
  height: number = width,
  text: string = 'Imagem'
): Promise<string> => {
  if (!imageUrl) {
    return getPlaceholderImage(width, height, text);
  }
  
  try {
    const isValid = await isImageValid(imageUrl);
    return isValid ? imageUrl : getPlaceholderImage(width, height, text);
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    return getPlaceholderImage(width, height, text);
  }
};

/**
 * Função para lidar com erros de carregamento de imagem
 * @param width Largura da imagem
 * @param height Altura da imagem
 * @param alt Texto alternativo
 * @returns URL da imagem placeholder
 */
export const getFallbackImageUrl = (
  width: number = 150,
  height: number = width,
  alt: string = 'Imagem'
): string => {
  return getPlaceholderImage(width, height, alt);
}; 