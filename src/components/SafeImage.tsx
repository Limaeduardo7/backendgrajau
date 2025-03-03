import { useState, useEffect } from 'react';
import { getFallbackImageUrl } from '../utils/imageUtils';

interface SafeImageProps {
  src: string | undefined | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente de imagem segura que lida com erros de carregamento
 * Substitui automaticamente imagens quebradas por placeholders
 */
const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  width = 150,
  height = width,
  className = '',
  style = {},
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src || getFallbackImageUrl(width, height, alt));
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    // Atualiza a fonte da imagem quando a prop src muda
    if (src) {
      setImgSrc(src);
      setHasError(false);
    } else {
      setImgSrc(getFallbackImageUrl(width, height, alt));
    }
  }, [src, width, height, alt]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(getFallbackImageUrl(width, height, alt));
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      onError={handleError}
    />
  );
};

export default SafeImage; 