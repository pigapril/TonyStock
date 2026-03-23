import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';

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
      timeoutMs: 20000,
      useIdleCallback: true,
      triggerOnInteraction: true,
      interactionEvents: ['pointerdown', 'keydown', 'touchstart', 'wheel']
    });
  });
});
