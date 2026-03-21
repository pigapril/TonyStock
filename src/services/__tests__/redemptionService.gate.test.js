jest.mock('../../utils/enhancedApiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
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

jest.mock('../../utils/redemptionFormatting', () => ({
  formatDate: jest.fn((value) => `formatted:${value}`)
}));

import redemptionService from '../redemptionService';
import enhancedApiClient from '../../utils/enhancedApiClient';

const mockEnhancedApiClient = enhancedApiClient;

describe('redemptionService regression gate', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    redemptionService.clearCache();
    redemptionService.pendingRequests.clear();
    redemptionService.requestThrottle.clear();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    redemptionService.destroy();
  });

  it('normalizes redemption codes and caches successful validation responses', async () => {
    mockEnhancedApiClient.get.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          code: 'SAVE50',
          isValid: true,
          canRedeem: true,
          summary: '代碼有效，可以兌換',
          errors: [],
          warnings: [],
          eligibility: { eligible: true },
          benefits: { type: 'discount', discountAmount: 50 }
        }
      }
    });

    const firstResult = await redemptionService.validateCode(' save50 ');
    const secondResult = await redemptionService.validateCode('SAVE50');

    expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockEnhancedApiClient.get).toHaveBeenCalledWith('/api/redemption/validate/SAVE50');
    expect(firstResult.success).toBe(true);
    expect(firstResult.data.code).toBe('SAVE50');
    expect(secondResult.fromCache).toBe(true);
    expect(secondResult.success).toBe(true);
  });

  it('surfaces backend validation error types for invalid codes', async () => {
    mockEnhancedApiClient.get.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          code: 'INVALID123',
          isValid: false,
          canRedeem: false,
          summary: '找不到此兌換代碼',
          errors: [{ type: 'CODE_NOT_FOUND', message: '找不到此兌換代碼' }],
          warnings: [],
          eligibility: null,
          benefits: null
        }
      }
    });

    const result = await redemptionService.validateCode('invalid123');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CODE_NOT_FOUND');
    expect(result.error).toBe('找不到此兌換代碼');
    expect(result.data.isValid).toBe(false);
  });

  it('returns preview data with the normalized code attached', async () => {
    mockEnhancedApiClient.post.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          codeType: 'PERCENTAGE_DISCOUNT',
          benefits: {
            type: 'discount',
            discountAmount: 100
          }
        }
      }
    });

    const result = await redemptionService.previewRedemption(' save100 ');

    expect(mockEnhancedApiClient.post).toHaveBeenCalledWith('/api/redemption/preview', {
      code: 'SAVE100'
    });
    expect(result).toEqual({
      success: true,
      data: {
        codeType: 'PERCENTAGE_DISCOUNT',
        benefits: {
          type: 'discount',
          discountAmount: 100
        },
        code: 'SAVE100'
      }
    });
  });

  it('maps preview client errors into structured responses without retrying', async () => {
    mockEnhancedApiClient.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'Invalid code',
          code: 'INVALID_CODE'
        }
      }
    });

    const result = await redemptionService.previewRedemption('invalid');

    expect(result).toEqual({
      success: false,
      error: 'Invalid code',
      errorCode: 'INVALID_CODE',
      details: undefined,
      requiresConfirmation: undefined,
      httpStatus: 400
    });
  });

  it('clears validation, history, and promotions cache after a successful redemption', async () => {
    mockEnhancedApiClient.get
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            code: 'SAVE50',
            isValid: true,
            canRedeem: true,
            summary: '代碼有效，可以兌換',
            errors: [],
            warnings: [],
            eligibility: { eligible: true },
            benefits: { type: 'discount', discountAmount: 50 }
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            items: [{ id: 'history-1', code: 'SAVE50' }],
            total: 1
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 'promo-1', code: 'SAVE50' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            items: [{ id: 'history-2', code: 'SAVE50' }],
            total: 1
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 'promo-2', code: 'SAVE50' }]
        }
      });

    mockEnhancedApiClient.post.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { code: 'SAVE50', benefits: { type: 'discount', discountAmount: 50 } }
      }
    });

    await redemptionService.validateCode('SAVE50');
    await redemptionService.getRedemptionHistory();
    await redemptionService.getActivePromotions();

    await redemptionService.redeemCode('save50', true);
    redemptionService.requestThrottle.clear();

    const historyResult = await redemptionService.getRedemptionHistory();
    const promotionsResult = await redemptionService.getActivePromotions();

    expect(mockEnhancedApiClient.post).toHaveBeenCalledWith('/api/redemption/redeem', {
      code: 'SAVE50',
      confirmed: true
    });
    expect(historyResult.fromCache).toBeUndefined();
    expect(promotionsResult.fromCache).toBeUndefined();
    expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(5);
  });

  it('caches active promotions and supports force-refresh', async () => {
    mockEnhancedApiClient.get
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 'promo-1', type: 'discount', amount: 10 }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 'promo-2', type: 'extension', days: 30 }]
        }
      });

    const firstResult = await redemptionService.getActivePromotions();
    const cachedResult = await redemptionService.getActivePromotions();
    redemptionService.requestThrottle.clear();
    const refreshedResult = await redemptionService.getActivePromotions(true);

    expect(firstResult.success).toBe(true);
    expect(cachedResult.fromCache).toBe(true);
    expect(refreshedResult.success).toBe(true);
    expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(2);
    expect(mockEnhancedApiClient.get).toHaveBeenNthCalledWith(1, '/api/redemption/active-promotions');
  });

  it('formats translated error messages and flags follow-up actions', () => {
    const translate = jest.fn((key, params) => {
      if (key === 'redemption.errors.plan_not_eligible') {
        return `eligible:${params.eligiblePlans}`;
      }

      if (key === 'redemption.errors.unknown') {
        return 'unknown';
      }

      return key;
    });

    const error = {
      errorCode: 'PLAN_NOT_ELIGIBLE',
      data: {
        errors: [
          {
            details: {
              eligiblePlanNames: 'Pro 或 Ultra'
            }
          }
        ]
      }
    };

    expect(redemptionService.formatErrorMessage(error, translate)).toBe('eligible:Pro 或 Ultra');
    expect(redemptionService.getErrorActionRequirements({ errorCode: 'CONFIRMATION_REQUIRED' })).toEqual({
      requiresConfirmation: true
    });
    expect(redemptionService.getErrorActionRequirements({ errorCode: 'STACKING_VIOLATION' })).toEqual({
      showActivePromotions: true
    });
  });

  it('caches redemption history and supports force-refresh refreshes', async () => {
    const historyPayload = {
      items: [{ id: 'history-1', code: 'SAVE50' }],
      total: 1
    };

    mockEnhancedApiClient.get
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: historyPayload
        }
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: historyPayload
        }
      });

    const firstResult = await redemptionService.getRedemptionHistory({ page: 2, status: 'APPLIED' });
    const cachedResult = await redemptionService.getRedemptionHistory({ page: 2, status: 'APPLIED' });
    redemptionService.requestThrottle.clear();
    const refreshedResult = await redemptionService.getRedemptionHistory({ page: 2, status: 'APPLIED' }, true);

    expect(mockEnhancedApiClient.get).toHaveBeenNthCalledWith(
      1,
      '/api/redemption/history?page=2&status=APPLIED'
    );
    expect(firstResult.success).toBe(true);
    expect(cachedResult.fromCache).toBe(true);
    expect(refreshedResult.success).toBe(true);
    expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(2);
  });
});
