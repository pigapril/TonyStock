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

const authStatusResponse = (user) => ({
  data: {
    status: 'success',
    data: {
      isAuthenticated: true,
      user
    }
  }
});

const noSubscriptionResponse = {
  data: {
    status: 'success',
    data: { subscription: null }
  }
};

describe('subscriptionService.getUserPlan - free plan start date', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the account creation date as the free plan start date', async () => {
    enhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/subscription/current') return Promise.resolve(noSubscriptionResponse);
      return Promise.resolve(authStatusResponse({
        id: 'user-1',
        plan: 'free',
        createdAt: '2026-03-05T08:30:00.000Z'
      }));
    });

    const plan = await subscriptionService.getUserPlan();

    expect(plan.type).toBe('free');
    expect(plan.startDate).toEqual(new Date('2026-03-05T08:30:00.000Z'));
  });

  it('leaves the start date empty instead of falling back to today', async () => {
    enhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/subscription/current') return Promise.resolve(noSubscriptionResponse);
      return Promise.resolve(authStatusResponse({ id: 'user-1', plan: 'free' }));
    });

    const plan = await subscriptionService.getUserPlan();

    expect(plan.startDate).toBeNull();
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
