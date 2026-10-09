import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, render, waitFor } from '@testing-library/react';

import DeferredTagManager, { getTagManagerDeferConfig } from './DeferredTagManager';

jest.mock('../../../utils/deferredScripts', () => ({
  __esModule: true,
  ensureGoogleTagManager: jest.fn(() => Promise.resolve(null))
}));

const { ensureGoogleTagManager } = require('../../../utils/deferredScripts');

describe('DeferredTagManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('keeps analysis routes idle until interaction happens', async () => {
    render(
      <MemoryRouter initialEntries={['/zh-TW/priceanalysis']}>
        <DeferredTagManager environment="production" />
      </MemoryRouter>
    );

    jest.advanceTimersByTime(2600);
    expect(ensureGoogleTagManager).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('pointerdown'));

    await waitFor(() => {
      expect(ensureGoogleTagManager).toHaveBeenCalledWith('GTM-NR4P4S7W');
    });
  });

  it('still auto-loads GTM on non-analysis routes after the shorter defer window', async () => {
    render(
      <MemoryRouter initialEntries={['/zh-TW/about']}>
        <DeferredTagManager environment="production" />
      </MemoryRouter>
    );

    jest.advanceTimersByTime(2600);

    await waitFor(() => {
      expect(ensureGoogleTagManager).toHaveBeenCalledWith('GTM-NR4P4S7W');
    });
  });

  it('returns the long interaction-first strategy for analysis routes', () => {
    expect(getTagManagerDeferConfig('/zh-TW/market-sentiment')).toEqual({
      timeoutMs: 45000,
      useIdleCallback: false,
      triggerOnInteraction: true,
      interactionEvents: ['pointerdown', 'keydown', 'touchstart']
    });
  });
});


test('首頁 GTM 在首屏等待期間不被提早的 idle callback 觸發', () => {
  jest.useFakeTimers();
  ensureGoogleTagManager.mockClear();
  window.requestIdleCallback = jest.fn(callback => window.setTimeout(callback, 0));
  window.cancelIdleCallback = jest.fn(id => window.clearTimeout(id));
  const { unmount } = render(<MemoryRouter initialEntries={['/zh-TW/']}><DeferredTagManager environment="production" /></MemoryRouter>);
  act(() => jest.advanceTimersByTime(3499));
  expect(ensureGoogleTagManager).not.toHaveBeenCalled();
  expect(window.requestIdleCallback).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(2));
  expect(ensureGoogleTagManager).toHaveBeenCalledWith('GTM-NR4P4S7W');
  unmount();
  jest.clearAllTimers();
  jest.useRealTimers();
  delete window.requestIdleCallback;
  delete window.cancelIdleCallback;
});
