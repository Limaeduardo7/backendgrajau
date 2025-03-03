/**
 * Script para lidar com imagens quebradas
 * Substitui automaticamente imagens que falham ao carregar por placeholders
 */
(function() {
  // URL base para imagens placeholder
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
   * Função para lidar com erros de carregamento de imagem
   * @param {Event} event - Evento de erro
   */
  function handleImageError(event) {
    const img = event.target;
    if (!img || !img.tagName || img.tagName.toLowerCase() !== 'img') return;
    
    // Evitar loop infinito
    if (img.src.startsWith(PLACEHOLDER_IMAGE_URL)) return;
    
    const width = img.width || 150;
    const height = img.height || 150;
    const alt = img.alt || 'Imagem';
    
    console.log(`Substituindo imagem quebrada: ${img.src}`);
    img.src = getPlaceholderImage(width, height, alt);
    
    // Remover o handler para evitar loops
    img.onerror = null;
  }

  /**
   * Adiciona handlers de erro a todas as imagens existentes
   */
  function setupExistingImages() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      // Verificar se a imagem já carregou com erro
      if (img.complete && img.naturalWidth === 0) {
        handleImageError({ target: img });
      } else {
        img.onerror = handleImageError;
      }
    });
  }

  /**
   * Observa novas imagens adicionadas ao DOM
   */
  function observeNewImages() {
    // Criar um MutationObserver para detectar novas imagens
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            // Verificar se o nó é uma imagem
            if (node.tagName && node.tagName.toLowerCase() === 'img') {
              node.onerror = handleImageError;
            }
            
            // Verificar imagens dentro do nó adicionado
            if (node.querySelectorAll) {
              const images = node.querySelectorAll('img');
              images.forEach(img => {
                img.onerror = handleImageError;
              });
            }
          });
        }
      });
    });
    
    // Iniciar observação
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupExistingImages();
      observeNewImages();
    });
  } else {
    setupExistingImages();
    observeNewImages();
  }
})(); 