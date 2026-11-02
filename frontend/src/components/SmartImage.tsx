import { useCallback, useState } from 'react';

/** The Dali "D" with its orange swoosh, shown wherever an image is not available. */
export function DaliMark({ className = '', light = false }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M58 7A44 44 0 1 0 66 92" fill="none" stroke="#f26b21" strokeWidth="7" strokeLinecap="round" />
      <text
        x="56"
        y="73"
        textAnchor="middle"
        fontFamily="'Noto Sans', 'Poppins', sans-serif"
        fontSize="66"
        fontWeight="700"
        fill={light ? '#ffffff' : '#0b5d3e'}
      >
        D
      </text>
    </svg>
  );
}

const TONES = {
  soft: 'bg-brand-soft',
  dark: 'bg-plum',
  hero: 'bg-hero',
  none: '',
};

/**
 * An image that shows the Dali mark until it has loaded, and keeps showing it if
 * the image is missing or fails. Size it through className, as it fills its box.
 */
export function SmartImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  fit = 'cover',
  loading,
  tone = 'soft',
}: {
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  fit?: 'cover' | 'contain';
  loading?: 'lazy' | 'eager';
  tone?: keyof typeof TONES;
}) {
  // Tracked per address, so changing src goes back to the placeholder by itself.
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const [failedSrc, setFailedSrc] = useState<string>();
  const loaded = Boolean(src) && loadedSrc === src;
  const failed = !src || failedSrc === src;

  // A cached image can finish before React attaches its load handler.
  const checkAlreadyDone = useCallback(
    (image: HTMLImageElement | null) => {
      if (!image?.complete || !src) return;
      if (image.naturalWidth > 0) setLoadedSrc(src);
      else if (image.getAttribute('src')) setFailedSrc(src);
    },
    [src],
  );

  const position = className.includes('absolute') ? '' : 'relative';
  return (
    <span
      className={`${position} block overflow-hidden ${TONES[tone]} ${className}`}
      {...(failed && alt ? { role: 'img', 'aria-label': alt } : {})}
    >
      {!loaded && (
        <span className="absolute inset-0 flex items-center justify-center">
          <DaliMark
            light={tone === 'dark' || tone === 'hero'}
            className={`aspect-square h-1/2 max-h-24 max-w-[60%] ${failed ? '' : 'animate-pulse'}`}
          />
        </span>
      )}
      {!failed && (
        <img
          key={src}
          ref={checkAlreadyDone}
          src={src}
          alt={alt}
          loading={loading}
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={`absolute inset-0 size-full transition-opacity duration-300 ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
    </span>
  );
}
