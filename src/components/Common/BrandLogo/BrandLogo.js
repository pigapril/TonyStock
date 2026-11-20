import React from 'react';

export const BRAND_LOGO_SRC = '/logo.png';
export const BRAND_LOGO_AVIF_SRC = '/logo.avif';
export const BRAND_LOGO_WEBP_SRC = '/logo.webp';

export function BrandLogo({
  alt,
  className = 'logo',
  width = 188,
  height = 32
}) {
  return (
    <picture>
      <source srcSet={BRAND_LOGO_AVIF_SRC} type="image/avif" />
      <source srcSet={BRAND_LOGO_WEBP_SRC} type="image/webp" />
      <img
        src={BRAND_LOGO_SRC}
        alt={alt}
        className={className}
        width={width}
        height={height}
        decoding="async"
        fetchpriority="high"
      />
    </picture>
  );
}

export default BrandLogo;
