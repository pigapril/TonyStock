import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render } from '@testing-library/react';

import { PageViewTracker } from './PageViewTracker';

describe('PageViewTracker', () => {
  beforeEach(() => {
    delete window.dataLayer;
    document.title = 'Sentiment Inside Out';
  });

  it('queues a pageview even before GTM bootstraps dataLayer', () => {
    render(
      <MemoryRouter initialEntries={['/zh-TW/priceanalysis']}>
        <Routes>
          <Route path="*" element={<PageViewTracker />} />
        </Routes>
      </MemoryRouter>
    );

    expect(window.dataLayer).toEqual([
      {
        event: 'pageview',
        page: {
          path: '/zh-TW/priceanalysis',
          title: 'Sentiment Inside Out'
        }
      }
    ]);
  });
});
