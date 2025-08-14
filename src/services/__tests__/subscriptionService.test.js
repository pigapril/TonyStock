/**
 * SubscriptionService 測試
 */

import subscriptionService from '../subscriptionService';
import apiClient from '../../api/apiClient';

// Mock API client
jest.mock('../../api/apiClient');
jest.mock('../../utils/logger');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('SubscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentSubscription', () => {
    it('gets current subscription successfully', async () => {
      const mockResponse = {
        data: {
          id: 'sub-123',
          planType: 'pro',
          status: 'active',
          billingPeriod: 'monthly',
          nextBillingDate: '2024-02-15T00:00:00Z',
          ecpaySubscriptionId: 'ecpay-sub-456'
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await subscriptionService.getCurrentSubscription();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/subscription/current');
      expect(result).toEqual(mockResponse.data);
    });

    it('handles get subscription error', async () => {
      const mockError = new Error('Subscription not found');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(subscriptionService.getCurrentSubscription()).rejects.toThrow('Subscription not found');
    });
  });

  describe('cancelSubscription', () => {
    it('cancels subscription successfully', async () => {
      const subscriptionId = 'sub-123';
      const mockResponse = {
        data: {
          success: true,
          message: 'Subscription cancelled',
          subscription: {
            id: 'sub-123',
            status: 'cancelled'
          }
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await subscriptionService.cancelSubscription(subscriptionId);

      expect(mockApiClient.post).toHaveBeenCalledWith(`/api/subscription/cancel/${subscriptionId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('handles cancel subscription error', async () => {
      const mockError = new Error('Cannot cancel active subscription');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(subscriptionService.cancelSubscription('sub-123')).rejects.toThrow('Cannot cancel active subscription');
    });
  });

  describe('reactivateSubscription', () => {
    it('reactivates subscription successfully', async () => {
      const subscriptionId = 'sub-123';
      const mockResponse = {
        data: {
          success: true,
          subscription: {
            id: 'sub-123',
            status: 'active'
          }
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await subscriptionService.reactivateSubscription(subscriptionId);

      expect(mockApiClient.post).toHaveBeenCalledWith(`/api/subscription/reactivate/${subscriptionId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('handles reactivate subscription error', async () => {
      const mockError = new Error('Subscription already active');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(subscriptionService.reactivateSubscription('sub-123')).rejects.toThrow('Subscription already active');
    });
  });

  describe('getSubscriptionHistory', () => {
    it('gets subscription history successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'sub-123',
            planType: 'pro',
            status: 'active',
            createdAt: '2024-01-15T10:00:00Z',
            billingPeriod: 'monthly'
          },
          {
            id: 'sub-456',
            planType: 'free',
            status: 'cancelled',
            createdAt: '2024-01-01T10:00:00Z',
            billingPeriod: 'monthly'
          }
        ]
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await subscriptionService.getSubscriptionHistory();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/subscription/history');
      expect(result).toEqual(mockResponse.data);
    });

    it('handles get history error', async () => {
      const mockError = new Error('Unauthorized');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(subscriptionService.getSubscriptionHistory()).rejects.toThrow('Unauthorized');
    });
  });

  describe('updateSubscription', () => {
    it('updates subscription successfully', async () => {
      const subscriptionId = 'sub-123';
      const updateData = {
        billingPeriod: 'yearly'
      };

      const mockResponse = {
        data: {
          id: 'sub-123',
          planType: 'pro',
          billingPeriod: 'yearly',
          status: 'active'
        }
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await subscriptionService.updateSubscription(subscriptionId, updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith(`/api/subscription/${subscriptionId}`, updateData);
      expect(result).toEqual(mockResponse.data);
    });

    it('handles update subscription error', async () => {
      const mockError = new Error('Invalid subscription data');
      mockApiClient.put.mockRejectedValue(mockError);

      await expect(subscriptionService.updateSubscription('sub-123', {})).rejects.toThrow('Invalid subscription data');
    });
  });
});