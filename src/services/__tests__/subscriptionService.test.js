import subscriptionService from '../subscriptionService';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient', () => jest.fn());
jest.mock('../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

const mockApiClient = apiClient;

describe('subscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current subscription wrapped in a success payload', async () => {
    const subscription = {
      id: 'sub-123',
      planType: 'pro',
      status: 'active'
    };

    mockApiClient.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          subscription
        }
      }
    });

    const result = await subscriptionService.getCurrentSubscription();

    expect(mockApiClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/subscription/current',
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    expect(result).toEqual({
      success: true,
      data: subscription
    });
  });

  it('submits cancellation with the normalized API payload', async () => {
    const responseData = {
      subscriptionId: 'sub-123',
      status: 'cancelled'
    };

    mockApiClient.mockResolvedValue({
      data: {
        status: 'success',
        data: responseData
      }
    });

    const result = await subscriptionService.cancelSubscription({
      cancelAtPeriodEnd: false,
      reason: 'billing_issue'
    });

    expect(mockApiClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/subscription/cancel',
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true,
      data: {
        cancelAtPeriodEnd: false,
        reason: 'billing_issue'
      }
    });
    expect(result).toEqual({
      success: true,
      data: responseData
    });
  });

  it('returns subscription history and pagination metadata', async () => {
    const subscriptions = [
      { id: 'sub-1', planType: 'pro' },
      { id: 'sub-2', planType: 'free' }
    ];
    const pagination = {
      limit: 10,
      offset: 0,
      total: 2
    };

    mockApiClient.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          subscriptions,
          pagination
        }
      }
    });

    const result = await subscriptionService.getSubscriptionHistory({
      limit: 10,
      offset: 0
    });

    expect(mockApiClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/subscription/history?limit=10&offset=0',
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    expect(result).toEqual({
      success: true,
      data: subscriptions,
      pagination
    });
  });

  it('returns a structured failure payload instead of throwing when current subscription lookup fails', async () => {
    mockApiClient.mockRejectedValue(new Error('network down'));

    const result = await subscriptionService.getCurrentSubscription();

    expect(result).toEqual({
      success: false,
      error: 'network down',
      errorCode: 'GET_SUBSCRIPTION_FAILED'
    });
  });
});
