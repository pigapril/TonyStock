import { subscriptionService } from '../subscriptionService';
import enhancedApiClient from '../../utils/enhancedApiClient';

jest.mock('../../utils/enhancedApiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

jest.mock('../../utils/csrfClient', () => ({
  __esModule: true,
  default: {
    isTokenInitialized: jest.fn(() => true),
    getCSRFToken: jest.fn(() => 'token')
  }
}));

jest.mock('../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

const noSubscriptionResponse = {
  data: {
    status: 'success',
    data: { subscription: null }
  }
};

describe('subscriptionService.getUserPlan - no-subscription fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null without making a second auth-status request when there is no subscription', async () => {
    enhancedApiClient.get.mockResolvedValue(noSubscriptionResponse);

    const plan = await subscriptionService.getUserPlan();

    expect(plan).toBeNull();
    expect(enhancedApiClient.get).toHaveBeenCalledTimes(1);
    expect(enhancedApiClient.get).toHaveBeenCalledWith('/api/subscription/current');
  });

  it('does not convert a failed subscription lookup into a free plan or auth-status request', async () => {
    enhancedApiClient.get.mockRejectedValue(new Error('Network unavailable'));

    await expect(subscriptionService.getUserPlan()).rejects.toThrow('Network unavailable');
    expect(enhancedApiClient.get).toHaveBeenCalledTimes(1);
    expect(enhancedApiClient.get).toHaveBeenCalledWith('/api/subscription/current');
  });

  it('keeps using the subscription start date when a subscription exists', async () => {
    enhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/subscription/current') {
        return Promise.resolve({
          data: {
            status: 'success',
            data: {
              subscription: {
                id: 'sub-1',
                planType: 'pro',
                status: 'active',
                startDate: '2026-01-10T00:00:00.000Z',
                currentPeriodEnd: '2026-02-10T00:00:00.000Z'
              }
            }
          }
        });
      }
      return Promise.resolve(authStatusResponse({ id: 'user-1', plan: 'pro' }));
    });

    const plan = await subscriptionService.getUserPlan();

    expect(plan.type).toBe('pro');
    expect(plan.startDate).toEqual(new Date('2026-01-10T00:00:00.000Z'));
  });
});

describe('subscriptionService.getUserPlan - bound card fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('carries billingRail, billingPeriod, trialEnd and renewalAmount through to the plan', async () => {
    enhancedApiClient.get.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          subscription: {
            id: 'sub-2',
            planType: 'pro',
            status: 'active',
            billingRail: 'bound_card',
            billingPeriod: 'yearly',
            trialEnd: '2026-10-13T16:00:00.000Z',
            renewalAmount: 1990
          }
        }
      }
    });

    const plan = await subscriptionService.getUserPlan();

    expect(plan).toEqual(expect.objectContaining({
      billingRail: 'bound_card',
      billingPeriod: 'yearly',
      trialEnd: new Date('2026-10-13T16:00:00.000Z'),
      renewalAmount: 1990
    }));
  });
});
