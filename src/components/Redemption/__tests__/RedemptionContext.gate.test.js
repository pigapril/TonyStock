import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockPreviewRedemption = jest.fn();
const mockRedeemCode = jest.fn();
const mockGetActivePromotions = jest.fn();
const mockGetRedemptionHistory = jest.fn();
const mockClearCache = jest.fn();
const mockGetCacheStats = jest.fn(() => ({ entries: 0 }));
const mockTrack = jest.fn();
const mockAnalyticsError = jest.fn();
const mockAuthState = {
  user: { id: 'user-123' },
  isAuthenticated: true
};

jest.mock('../../Auth/useAuth', () => ({
  useAuth: () => mockAuthState
}));

jest.mock('../../../services/redemptionService', () => ({
  __esModule: true,
  default: {
    previewRedemption: (...args) => mockPreviewRedemption(...args),
    redeemCode: (...args) => mockRedeemCode(...args),
    getActivePromotions: (...args) => mockGetActivePromotions(...args),
    getRedemptionHistory: (...args) => mockGetRedemptionHistory(...args),
    clearCache: (...args) => mockClearCache(...args),
    getCacheStats: (...args) => mockGetCacheStats(...args)
  }
}));

jest.mock('../../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../../utils/analytics', () => ({
  Analytics: {
    track: (...args) => mockTrack(...args),
    error: (...args) => mockAnalyticsError(...args)
  }
}));

import { RedemptionProvider, useRedemption } from '../RedemptionContext';

const wrapper = ({ children }) => (
  <RedemptionProvider>{children}</RedemptionProvider>
);

describe('RedemptionContext regression gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActivePromotions.mockResolvedValue({ success: true, data: [] });
    mockGetRedemptionHistory.mockResolvedValue({ success: true, data: { items: [] } });
  });

  it('loads promotions and redemption history for authenticated users on mount', async () => {
    const promotions = [{ id: 'promo-1', code: 'SAVE50' }];
    const history = { items: [{ id: 'history-1', code: 'SAVE50' }] };

    mockGetActivePromotions.mockResolvedValueOnce({
      success: true,
      data: promotions
    });
    mockGetRedemptionHistory.mockResolvedValueOnce({
      success: true,
      data: history
    });

    const { result } = renderHook(() => useRedemption(), { wrapper });

    await waitFor(() => {
      expect(result.current.activePromotions).toEqual(promotions);
      expect(result.current.redemptionHistory).toEqual(history);
    });

    expect(mockGetActivePromotions).toHaveBeenCalledWith(false);
    expect(mockGetRedemptionHistory).toHaveBeenCalledWith({}, false);
  });

  it('forces downstream promotion and history refreshes after a successful redemption', async () => {
    mockRedeemCode.mockResolvedValueOnce({
      success: true,
      data: {
        codeType: 'TIME_EXTENSION',
        benefits: { type: 'extension', extensionDays: 30 }
      }
    });

    const { result } = renderHook(() => useRedemption(), { wrapper });

    await waitFor(() => {
      expect(mockGetActivePromotions).toHaveBeenCalledTimes(1);
      expect(mockGetRedemptionHistory).toHaveBeenCalledTimes(1);
    });

    mockGetActivePromotions.mockClear();
    mockGetRedemptionHistory.mockClear();
    mockGetActivePromotions.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'promo-2', code: 'BOOST30' }]
    });
    mockGetRedemptionHistory.mockResolvedValueOnce({
      success: true,
      data: { items: [{ id: 'history-2', code: 'BOOST30' }] }
    });

    await act(async () => {
      await result.current.redeemCode('boost30', true);
    });

    await waitFor(() => {
      expect(result.current.redemptionStep).toBe('success');
    });

    expect(result.current.currentRedemption).toEqual(
      expect.objectContaining({
        code: 'BOOST30',
        status: 'success',
        result: {
          codeType: 'TIME_EXTENSION',
          benefits: { type: 'extension', extensionDays: 30 }
        }
      })
    );
    expect(mockGetActivePromotions).toHaveBeenCalledWith(true);
    expect(mockGetRedemptionHistory).toHaveBeenCalledWith({}, true);
  });

  it('keeps the flow in confirming state when the backend requires explicit confirmation', async () => {
    mockRedeemCode.mockResolvedValueOnce({
      success: false,
      error: 'Confirmation required',
      errorCode: 'CONFIRMATION_REQUIRED',
      requiresConfirmation: true,
      details: {
        codeType: 'TIME_EXTENSION',
        benefits: { type: 'extension', extensionDays: 30 }
      }
    });

    const { result } = renderHook(() => useRedemption(), { wrapper });

    await waitFor(() => {
      expect(mockGetActivePromotions).toHaveBeenCalledTimes(1);
      expect(mockGetRedemptionHistory).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.redeemCode('boost30', false);
    });

    expect(result.current.redemptionStep).toBe('confirming');
    expect(result.current.currentRedemption).toEqual(
      expect.objectContaining({
        code: 'BOOST30',
        requiresConfirmation: true,
        preview: {
          codeType: 'TIME_EXTENSION',
          benefits: { type: 'extension', extensionDays: 30 }
        }
      })
    );
  });
});
