/**
 * Tests for RedemptionContext
 * Covers state management, redemption flow, and integration
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { RedemptionProvider, useRedemption } from '../RedemptionContext';
import redemptionService from '../../../services/redemptionService';
import { Analytics } from '../../../utils/analytics';

// Mock dependencies
jest.mock('../../../services/redemptionService');
jest.mock('../../../utils/analytics');
jest.mock('../../../utils/logger');
jest.mock('../../Auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    isAuthenticated: true
  })
}));

const wrapper = ({ children }) => (
  <RedemptionProvider>{children}</RedemptionProvider>
);

describe('RedemptionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('should provide initial state', () => {
      const { result } = renderHook(() => useRedemption(), { wrapper });

      expect(result.current.activePromotions).toBeNull();
      expect(result.current.redemptionHistory).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentRedemption).toBeNull();
      expect(result.current.redemptionStep).toBe('input');
    });
  });

  describe('Code Preview', () => {
    test('should preview code successfully', async () => {
      const mockPreviewData = {
        codeType: 'PERCENTAGE_DISCOUNT',
        benefits: { type: 'discount', amount: 10 }
      };

      redemptionService.previewRedemption.mockResolvedValueOnce({
        success: true,
        data: mockPreviewData
      });

      const { result } = renderHook(() => useRedemption(), { wrapper });

      await act(async () => {
        const response = await result.current.previewCode('TEST123');
        expect(response.success).toBe(true);
      });

      expect(result.current.currentRedemption).toEqual({
        code: 'TEST123',
        preview: mockPreviewData,
        timestamp: expect.any(Number)
      });
      expect(result.current.redemptionStep).toBe('preview');
      expect(Analytics.track).toHaveBeenCalledWith('redemption_code_previewed', {
        userId: 'test-user-id',
        codeType: 'PERCENTAGE_DISCOUNT',
        benefitType: 'discount'
      });
    });

    test('should handle preview errors', async () => {
      redemptionService.previewRedemption.mockResolvedValueOnce({
        success: false,
        error: 'Invalid code',
        errorCode: 'INVALID_CODE'
      });

      const { result } = renderHook(() => useRedemption(), { wrapper });

      await act(async () => {
        const response = await result.current.previewCode('INVALID');
        expect(response.success).toBe(false);
      });

      expect(result.current.error).toBe('Invalid code');
      expect(result.current.redemptionStep).toBe('error');
      expect(Analytics.track).toHaveBeenCalledWith('redemption_preview_failed', {
        userId: 'test-user-id',
        errorCode: 'INVALID_CODE',
        error: 'Invalid code'
      });
    });

    test('should validate empty code input', async () => {
      const { result } = renderHook(() => useRedemption(), { wrapper });

      await act(async () => {
        const response = await result.current.previewCode('');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Please enter a redemption code');
      });

      expect(result.current.error).toBe('Please enter a redemption code');
    });
  });

  describe('Code Redemption', () => {
    test('should redeem code successfully', async () => {
      const mockRedemptionData = {
        codeType: 'PERCENTAGE_DISCOUNT',
        benefits: { type: 'discount', amount: 10 }
      };

      redemptionService.redeemCode.mockResolvedValueOnce({
        success: true,
        data: mockRedemptionData
      });

      redemptionService.getActivePromotions.mockResolvedValueOnce({
        success: true,
        data: []
      });

      redemptionService.getRedemptionHistory.mockResolvedValueOnce({
        success: true,
        data: { items: [] }
      });

      const { result } = renderHook(() => useRedemption(), { wrapper });

      await act(async () => {
        const response = await result.current.redeemCode('TEST123', true);
        expect(response.success).toBe(true);
      });

      expect(result.current.currentRedemption).toEqual({
        code: 'TEST123',
        result: mockRedemptionData,
        timestamp: expect.any(Number),
        status: 'success'
      });
      expect(result.current.redemptionStep).toBe('success');
      expect(Analytics.track).toHaveBeenCalledWith('redemption_code_redeemed', {
        userId: 'test-user-id',
        codeType: 'PERCENTAGE_DISCOUNT',
        benefitType: 'discount',
        discountAmount: undefined
      });
    });

    test('should handle confirmation requirement', async () => {
      redemptionService.redeemCode.mockResolvedValueOnce({
        success: false,
        error: 'Confirmation required',
        errorCode: 'CONFIRMATION_REQUIRED',
        requiresConfirmation: true,
        details: { preview: 'data' }
      });

      const { result } = renderHook(() => useRedemption(), { wrapper });

      await act(async () => {
        const response = await result.current.redeemCode('TEST123', false);
        expect(response.success).toBe(false);
      });

      expect(result.current.redemptionStep).toBe('confirming');
      expect(result.current.currentRedemption).toEqual({
        code: 'TEST123',
        preview: { preview: 'data' },
        requiresConfirmation: true,
        timestamp: expect.any(Number)
      });
    });

    test('should handle redemption errors', async () => {
      redemptionService.redeemCode.mockResolvedValueOnce({
        success: false,
        error: 'Code expired',
        errorCode: 'CODE_EXPIRED'
      });

      const { result } = renderHook(() => useRedemption(), { wrapper });

      await act(async () => {
        const response = await result.current.redeemCode('EXPIRED123', true);
        expect(response.success).toBe(false);
      });

      expect(result.current.error).toBe('Code expired');
      expect(result.current.redemptionStep).toBe('error');
      expect(Analytics.track).toHaveBeenCalledWith('redemption_failed', {
        userId: 'test-user-id',
        errorCode: 'CODE_EXPIRED',
        error: 'Code expired',
        requiresConfirmation: false
      });
    });
  });

  describe('State Management', () => {
    test('should clear redemption state', () => {
      const { result } = renderHook(() => useRedemption(), { wrapper });

      act(() => {
        result.current.clearRedemptionState();
      });

      expect(result.current.currentRedemption).toBeNull();
      expect(result.current.redemptionStep).toBe('input');
      expect(result.current.error).toBeNull();
    });

    test('should cancel redemption', () => {
      const { result } = renderHook(() => useRedemption(), { wrapper });

      act(() => {
        result.current.cancelRedemption();
      });

      expect(result.current.currentRedemption).toBeNull();
      expect(result.current.redemptionStep).toBe('input');
      expect(Analytics.track).toHaveBeenCalledWith('redemption_cancelled', {
        userId: 'test-user-id',
        step: 'input'
      });
    });
  });

  describe('Data Refresh', () => {
    test('should refresh active promotions', async () => {
      const mockPromotions = [
        { id: '1', type: 'discount' },
        { id: '2', type: 'extension' }
      ];

      redemptionService.getActivePromotions.mockResolvedValueOnce({
        success: true,
        data: mockPromotions
      });

      const { result } = renderHook(() => useRedemption(), { wrapper });

      await act(async () => {
        await result.current.refreshActivePromotions();
      });

      expect(result.current.activePromotions).toEqual(mockPromotions);
      expect(Analytics.track).toHaveBeenCalledWith('active_promotions_loaded', {
        userId: 'test-user-id',
        promotionCount: 2,
        fromCache: undefined
      });
    });

    test('should refresh redemption history', async () => {
      const mockHistory = {
        items: [
          { id: '1', code: 'TEST123' },
          { id: '2', code: 'TEST456' }
        ],
        total: 2
      };

      redemptionService.getRedemptionHistory.mockResolvedValueOnce({
        success: true,
        data: mockHistory
      });

      const { result } = renderHook(() => useRedemption(), { wrapper });

      await act(async () => {
        await result.current.refreshRedemptionHistory();
      });

      expect(result.current.redemptionHistory).toEqual(mockHistory);
      expect(Analytics.track).toHaveBeenCalledWith('redemption_history_loaded', {
        userId: 'test-user-id',
        historyCount: 2,
        fromCache: undefined
      });
    });

    test('should handle refresh errors gracefully', async () => {
      redemptionService.getActivePromotions.mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useRedemption(), { wrapper });

      await act(async () => {
        await result.current.refreshActivePromotions();
      });

      expect(result.current.error).toBe('Network error');
      expect(Analytics.error).toHaveBeenCalledWith({
        type: 'REDEMPTION_ERROR',
        code: 500,
        message: 'Network error',
        context: 'refreshActivePromotions'
      });
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', () => {
      const { result } = renderHook(() => useRedemption(), { wrapper });

      act(() => {
        result.current.clearCache();
      });

      expect(redemptionService.clearCache).toHaveBeenCalled();
    });

    test('should get cache stats', () => {
      const mockStats = {
        totalEntries: 5,
        byType: { redemptionHistory: 2, activePromotions: 1 }
      };

      redemptionService.getCacheStats.mockReturnValueOnce(mockStats);

      const { result } = renderHook(() => useRedemption(), { wrapper });

      const stats = result.current.getCacheStats();
      expect(stats).toEqual(mockStats);
    });
  });
});