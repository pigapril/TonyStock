import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render } from '@testing-library/react';

import { PageViewTracker } from './PageViewTracker';

describe('PageViewTracker', () => {
  beforeEach(() => {
    delete window.dataLayer;
    document.title = 'Sentiment Inside Out';
  });

  it('queues a page_view even before GTM bootstraps dataLayer', () => {
    render(
      <MemoryRouter initialEntries={['/zh-TW/priceanalysis']}>
        <Routes>
          <Route path="*" element={<PageViewTracker />} />
        </Routes>
      </MemoryRouter>
    );

    expect(window.dataLayer).toEqual([
      {
        event: 'page_view',
        page_path: '/zh-TW/priceanalysis',
        page_location: window.location.href,
        page_title: 'Sentiment Inside Out'
      }
    ]);
  });

  it('excludes transaction parameters from payment page views', () => {
    render(<MemoryRouter initialEntries={['/zh-TW/payment/card-trial/result?merchantTradeNo=private&status=success']}><PageViewTracker /></MemoryRouter>);
    expect(window.dataLayer[0].page_location).toBe(`${window.location.origin}/zh-TW/payment/card-trial/result`);
    expect(JSON.stringify(window.dataLayer)).not.toContain('private');
  });
});
