import { renderHook, act, waitFor } from '@testing-library/react';

let mockRedemptionContext;
let mockSubscriptionContext;

jest.mock('../../components/Redemption/RedemptionContext', () => ({
  useRedemption: () => mockRedemptionContext
}));

jest.mock('../../components/Subscription/SubscriptionContext', () => ({
  useSubscription: () => mockSubscriptionContext
}));

jest.mock('../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

import useRedemptionIntegration from '../useRedemptionIntegration';

describe('useRedemptionIntegration regression gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockRedemptionContext = {
      activePromotions: [],
      redemptionHistory: { items: [] },
      loading: false,
      error: null,
      redeemCode: jest.fn(),
      refreshActivePromotions: jest.fn().mockResolvedValue(undefined),
      refreshRedemptionHistory: jest.fn().mockResolvedValue(undefined),
      clearRedemptionState: jest.fn()
    };

    mockSubscriptionContext = {
      userPlan: null,
      loading: false,
      error: null,
      hasActivePromotions: false,
      isPromotionalSubscription: false,
      promotionalBenefits: null,
      promotionExpiresAt: null,
      onRedemptionSuccess: jest.fn().mockResolvedValue(undefined),
      onRedemptionError: jest.fn(),
      refreshUserPlan: jest.fn().mockResolvedValue(undefined),
      refreshUsageStats: jest.fn().mockResolvedValue(undefined),
      refreshSubscriptionHistory: jest.fn().mockResolvedValue(undefined)
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('auto-refreshes redemption promotions when the current plan already came from redemption', async () => {
    mockSubscriptionContext.userPlan = {
      redemptionSource: 'redemption'
    };

    renderHook(() => useRedemptionIntegration());

    await waitFor(() => {
      expect(mockRedemptionContext.refreshActivePromotions).toHaveBeenCalledWith();
    });
  });

  it('propagates successful redemptions through subscription refreshes and clears the flow after 3 seconds', async () => {
    jest.useFakeTimers();

    const redemptionData = {
      code: 'SAVE50',
      codeType: 'PERCENTAGE_DISCOUNT',
      benefits: { type: 'discount', discountAmount: 50 }
    };

    mockRedemptionContext.redeemCode.mockResolvedValue({
      success: true,
      data: redemptionData
    });

    const { result } = renderHook(() => useRedemptionIntegration());

    await act(async () => {
      await result.current.redeemCode('SAVE50', true);
    });

    expect(mockRedemptionContext.redeemCode).toHaveBeenCalledWith('SAVE50', true);
    expect(mockSubscriptionContext.onRedemptionSuccess).toHaveBeenCalledWith(redemptionData);
    expect(mockRedemptionContext.refreshActivePromotions).toHaveBeenCalledWith(true);
    expect(mockRedemptionContext.refreshRedemptionHistory).toHaveBeenCalledWith(true);
    expect(mockRedemptionContext.clearRedemptionState).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockRedemptionContext.clearRedemptionState).toHaveBeenCalled();
  });

  it('routes failed redemptions to the subscription error handler without running success refreshes', async () => {
    mockRedemptionContext.redeemCode.mockResolvedValue({
      success: false,
      error: 'Code expired',
      errorCode: 'CODE_EXPIRED'
    });

    const { result } = renderHook(() => useRedemptionIntegration());

    await act(async () => {
      await result.current.redeemCode('EXPIRED123', true);
    });

    expect(mockSubscriptionContext.onRedemptionError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Code expired',
        errorCode: 'CODE_EXPIRED'
      })
    );
    expect(mockSubscriptionContext.onRedemptionSuccess).not.toHaveBeenCalled();
    expect(mockRedemptionContext.refreshActivePromotions).not.toHaveBeenCalled();
    expect(mockRedemptionContext.refreshRedemptionHistory).not.toHaveBeenCalled();
  });

  it('refreshes subscription and redemption data together for post-redemption synchronization', async () => {
    mockRedemptionContext.activePromotions = [{ id: 'promo-1' }];
    mockRedemptionContext.redemptionHistory = { items: [{ id: 'history-1' }] };

    const { result } = renderHook(() => useRedemptionIntegration());

    await act(async () => {
      await result.current.refreshAllData();
    });

    expect(mockSubscriptionContext.refreshUserPlan).toHaveBeenCalled();
    expect(mockSubscriptionContext.refreshUsageStats).toHaveBeenCalled();
    expect(mockSubscriptionContext.refreshSubscriptionHistory).toHaveBeenCalled();
    expect(mockRedemptionContext.refreshActivePromotions).toHaveBeenCalledWith(true);
    expect(mockRedemptionContext.refreshRedemptionHistory).toHaveBeenCalledWith(true);
    expect(result.current.hasAnyPromotions()).toBe(true);
    expect(result.current.getPromotionalStatus()).toEqual(
      expect.objectContaining({
        hasActivePromotions: true,
        activePromotions: [{ id: 'promo-1' }],
        redemptionHistory: { items: [{ id: 'history-1' }] }
      })
    );
  });
});
