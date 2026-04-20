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
});
