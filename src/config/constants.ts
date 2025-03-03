// Configuração para imagens placeholder
export const PLACEHOLDER_IMAGE_URL = 'https://placehold.co';

// Função para gerar URLs de imagens placeholder
export const getPlaceholderImage = (width: number, height: number = width, text?: string): string => {
  const baseUrl = `${PLACEHOLDER_IMAGE_URL}/${width}x${height}`;
  
  if (text) {
    return `${baseUrl}?text=${encodeURIComponent(text)}`;
  }
  
  return baseUrl;
}; 