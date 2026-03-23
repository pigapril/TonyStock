import React from 'react';

export const BRAND_LOGO_SRC = '/logo.png';

export function BrandLogo({
  alt,
  className = 'logo',
  width = 188,
  height = 38
}) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={alt}
      className={className}
      width={width}
      height={height}
      decoding="async"
      fetchpriority="high"
    />
  );
}

export default BrandLogo;
