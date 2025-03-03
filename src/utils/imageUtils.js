/**
 * URL base para imagens placeholder
 */
const PLACEHOLDER_IMAGE_URL = 'https://placehold.co';

/**
 * Gera uma URL para uma imagem placeholder
 * @param {number} width - Largura da imagem
 * @param {number} height - Altura da imagem (opcional, padrão é igual à largura)
 * @param {string} text - Texto a ser exibido na imagem (opcional)
 * @returns {string} URL da imagem placeholder
 */
function getPlaceholderImage(width, height = width, text) {
  const baseUrl = `${PLACEHOLDER_IMAGE_URL}/${width}x${height}`;
  
  if (text) {
    return `${baseUrl}?text=${encodeURIComponent(text)}`;
  }
  
  return baseUrl;
}

/**
 * Verifica se uma URL de imagem é válida
 * @param {string} url - URL da imagem a ser verificada
 * @returns {Promise<boolean>} Promise que resolve para true se a imagem for válida, false caso contrário
 */
async function isImageValid(url) {
  if (!url) return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar imagem:', error);
    return false;
  }
}

/**
 * Retorna uma URL de imagem fallback se a imagem original falhar
 * @param {string|null} imageUrl - URL da imagem original
 * @param {number} width - Largura da imagem fallback (opcional, padrão é 150)
 * @param {number} height - Altura da imagem fallback (opcional, padrão é igual à largura)
 * @param {string} text - Texto opcional para exibir na imagem fallback (opcional)
 * @returns {Promise<string>} URL da imagem original ou do fallback
 */
async function getImageWithFallback(imageUrl, width = 150, height = width, text = 'Imagem') {
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
}

/**
 * Função para lidar com erros de carregamento de imagem
 * @param {number} width - Largura da imagem (opcional, padrão é 150)
 * @param {number} height - Altura da imagem (opcional, padrão é igual à largura)
 * @param {string} alt - Texto alternativo (opcional, padrão é 'Imagem')
 * @returns {string} URL da imagem placeholder
 */
function getFallbackImageUrl(width = 150, height = width, alt = 'Imagem') {
  return getPlaceholderImage(width, height, alt);
}

/**
 * Função para adicionar a todos os elementos de imagem na página
 * um handler de erro que substitui imagens quebradas por placeholders
 */
function setupImageErrorHandlers() {
  document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      img.addEventListener('error', () => {
        const width = img.width || 150;
        const height = img.height || 150;
        const alt = img.alt || 'Imagem';
        
        img.src = getPlaceholderImage(width, height, alt);
      });
    });
  });
}

// Exportar as funções
module.exports = {
  getPlaceholderImage,
  isImageValid,
  getImageWithFallback,
  getFallbackImageUrl,
  setupImageErrorHandlers
}; 