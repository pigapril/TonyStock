import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import i18n from '../../i18n';
import PageContainer from './PageContainer';

const renderPage = (url, props = {}) => render(
  <I18nextProvider i18n={i18n}>
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/:lang/*" element={<PageContainer title="Test" {...props}>Content</PageContainer>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  </I18nextProvider>
);

describe('PageContainer search metadata', () => {
  it('uses sitemap-style trailing slashes for localized home alternates', async () => {
    const { unmount } = renderPage('/en/');

    await waitFor(() => {
      expect(document.head.querySelector('link[rel="alternate"][hreflang="en"]')?.href)
        .toBe(`${window.location.origin}/en/`);
      expect(document.head.querySelector('link[rel="alternate"][hreflang="zh-TW"]')?.href)
        .toBe(`${window.location.origin}/zh-TW/`);
      expect(document.head.querySelector('link[rel="alternate"][hreflang="zh"]')).toBeNull();
    });

    unmount();
  });

  it('does not invent same-slug hreflang links for translated articles', async () => {
    const canonical = `${window.location.origin}/en/articles/english-article`;
    const { unmount } = renderPage('/en/articles/english-article', {
      ogUrl: canonical,
      includeHreflang: false
    });

    await waitFor(() => {
      expect(document.head.querySelector('link[rel="canonical"]')?.href).toBe(`${canonical}/`);
      expect(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).toHaveLength(0);
    });

    unmount();
  });

  it('uses the final trailing-slash URL for indicator metadata', async () => {
    const { unmount } = renderPage('/en/sentiment-indicators/cnn-fear-greed', {
      ogUrl: `${window.location.origin}/en/sentiment-indicators/cnn-fear-greed`
    });

    await waitFor(() => {
      expect(document.head.querySelector('link[rel="canonical"]')?.href)
        .toBe(`${window.location.origin}/en/sentiment-indicators/cnn-fear-greed/`);
      expect(document.head.querySelector('link[rel="alternate"][hreflang="zh-TW"]')?.href)
        .toBe(`${window.location.origin}/zh-TW/sentiment-indicators/cnn-fear-greed/`);
    });

    unmount();
  });
});
