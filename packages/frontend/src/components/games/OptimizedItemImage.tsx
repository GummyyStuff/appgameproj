import React from 'react';

interface OptimizedItemImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Optimized item image component with:
 * - Native WebP support
 * - Lazy loading for performance
 * - Error handling with fallback
 * - Automatic object-fit covering
 */
export const OptimizedItemImage: React.FC<OptimizedItemImageProps> = ({
  src,
  alt,
  className = '',
  fallback
}) => {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Show fallback if no src, error occurred, or still loading
  if (!src || hasError || fallback) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`w-full h-full object-cover ${className}`}
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      style={{
        opacity: isLoading ? 0 : 1,
        transition: 'opacity 0.2s ease-in-out'
      }}
    />
  );
};
