import React from 'react';
import { render, screen } from '@testing-library/react';

import BrandLogo, {
  BRAND_LOGO_AVIF_SRC,
  BRAND_LOGO_SRC,
  BRAND_LOGO_WEBP_SRC,
} from './BrandLogo';

describe('BrandLogo', () => {
  it('renders the shared png logo asset', () => {
    render(<BrandLogo alt="Sentiment Inside Out" />);

    const image = screen.getByRole('img', { name: 'Sentiment Inside Out' });
    expect(image).toHaveAttribute('src', BRAND_LOGO_SRC);
    expect(image).toHaveAttribute('width', '188');
    expect(image).toHaveAttribute('height', '32');

    const picture = image.closest('picture');
    expect(picture.querySelector('source[type="image/avif"]')).toHaveAttribute('srcSet', BRAND_LOGO_AVIF_SRC);
    expect(picture.querySelector('source[type="image/webp"]')).toHaveAttribute('srcSet', BRAND_LOGO_WEBP_SRC);
  });
});
