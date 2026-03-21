import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockGetUserPlan = jest.fn();
const mockGetUserUsageStats = jest.fn();
const mockGetSubscriptionHistory = jest.fn();
const mockAnalyticsTrack = jest.fn();
const mockAnalyticsError = jest.fn();

const mockAuthState = {
    user: { id: 'user-123', plan: 'pro' },
    isAuthenticated: true,
    checkAuthStatus: jest.fn().mockResolvedValue(undefined)
};

jest.mock('../../Auth/useAuth', () => ({
    useAuth: () => mockAuthState
}));

jest.mock('../../../api/subscriptionService', () => ({
    subscriptionService: {
        getUserPlan: (...args) => mockGetUserPlan(...args),
        getUserUsageStats: (...args) => mockGetUserUsageStats(...args),
        getSubscriptionHistory: (...args) => mockGetSubscriptionHistory(...args),
        updateUserPlan: jest.fn(),
        cancelSubscription: jest.fn()
    }
}));

jest.mock('../../../utils/analytics', () => ({
    Analytics: {
        track: (...args) => mockAnalyticsTrack(...args),
        error: (...args) => mockAnalyticsError(...args)
    }
}));

jest.mock('../../Redemption/RedemptionContext', () => ({
    useRedemption: () => ({
        activePromotions: [],
        redemptionHistory: { items: [] }
    })
}));

import { SubscriptionProvider, useSubscription } from '../SubscriptionContext';

const wrapper = ({ children }) => (
    <SubscriptionProvider>{children}</SubscriptionProvider>
);

describe('SubscriptionContext regression gate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthState.user = { id: 'user-123', plan: 'pro' };
        mockAuthState.isAuthenticated = true;
        mockAuthState.checkAuthStatus = jest.fn().mockResolvedValue(undefined);
        mockGetUserUsageStats.mockResolvedValue({
            total: 3
        });
        mockGetSubscriptionHistory.mockResolvedValue([]);
    });

    it('maps redemption-backed plans into promotional subscription state on load', async () => {
        const activePromotions = [{ id: 'promo-1', code: 'BOOST30' }];
        mockGetUserPlan.mockResolvedValueOnce({
            planType: 'pro',
            redemptionSource: 'mixed',
            activePromotions,
            promotionalExpirationDate: '2026-04-30T00:00:00.000Z'
        });

        const { result } = renderHook(() => useSubscription(), { wrapper });

        await waitFor(() => {
            expect(result.current.userPlan).toEqual(
                expect.objectContaining({
                    type: 'pro',
                    redemptionSource: 'mixed'
                })
            );
        });

        expect(result.current.hasActivePromotions).toBe(true);
        expect(result.current.isPromotionalSubscription).toBe(false);
        expect(result.current.promotionalBenefits).toEqual(activePromotions);
        expect(result.current.promotionExpiresAt).toBe('2026-04-30T00:00:00.000Z');
    });

    it('refreshes plan, usage, and subscription history after redemption success', async () => {
        mockGetUserPlan
            .mockResolvedValueOnce({
                planType: 'free',
                redemptionSource: null,
                activePromotions: []
            })
            .mockResolvedValueOnce({
                planType: 'pro',
                redemptionSource: 'redemption',
                activePromotions: [{ id: 'promo-2', code: 'SAVE50' }],
                promotionalExpirationDate: '2026-05-31T00:00:00.000Z'
            });

        const { result } = renderHook(() => useSubscription(), { wrapper });

        await waitFor(() => {
            expect(result.current.userPlan?.type).toBe('free');
        });

        mockGetUserPlan.mockClear();
        mockGetUserUsageStats.mockClear();
        mockGetSubscriptionHistory.mockClear();

        await act(async () => {
            await result.current.onRedemptionSuccess({
                codeType: 'PERCENTAGE_DISCOUNT',
                benefits: { type: 'discount', discountAmount: 50 }
            });
        });

        await waitFor(() => {
            expect(result.current.userPlan?.redemptionSource).toBe('redemption');
        });

        expect(mockGetUserPlan).toHaveBeenCalledTimes(1);
        expect(mockGetUserUsageStats).toHaveBeenCalledTimes(1);
        expect(mockGetSubscriptionHistory).toHaveBeenCalledTimes(1);
        expect(result.current.hasActivePromotions).toBe(true);
        expect(result.current.isPromotionalSubscription).toBe(true);
        expect(mockAnalyticsTrack).toHaveBeenCalledWith('subscription_updated_by_redemption', {
            userId: 'user-123',
            redemptionType: 'PERCENTAGE_DISCOUNT',
            benefitType: 'discount'
        });
    });

    it('clears promotional subscription state when the user logs out', async () => {
        mockGetUserPlan.mockResolvedValueOnce({
            planType: 'pro',
            redemptionSource: 'redemption',
            activePromotions: [{ id: 'promo-3', code: 'LOYALTY' }],
            promotionalExpirationDate: '2026-04-30T00:00:00.000Z'
        });

        const { result, rerender } = renderHook(() => useSubscription(), { wrapper });

        await waitFor(() => {
            expect(result.current.hasActivePromotions).toBe(true);
        });

        mockAuthState.user = null;
        mockAuthState.isAuthenticated = false;
        rerender();

        await waitFor(() => {
            expect(result.current.userPlan).toBeNull();
        });

        expect(result.current.hasActivePromotions).toBe(false);
        expect(result.current.promotionalBenefits).toBeNull();
        expect(result.current.isPromotionalSubscription).toBe(false);
        expect(result.current.promotionExpiresAt).toBeNull();
    });
});
