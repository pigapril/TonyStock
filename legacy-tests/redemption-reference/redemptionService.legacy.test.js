/**
 * Tests for RedemptionService
 * Covers caching, retry logic, error handling, and API integration
 */

import redemptionService from '../redemptionService';

// Mock dependencies
jest.mock('../../utils/enhancedApiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const mockEnhancedApiClient = require('../../utils/enhancedApiClient');

describe('RedemptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redemptionService.clearCache();
  });

  afterEach(() => {
    redemptionService.clearCache();
  });

  describe('Code Validation', () => {
    test('should return error for invalid codes', async () => {
      const mockResponse = {
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
          },
          message: '找不到此兌換代碼'
        }
      };

      mockEnhancedApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await redemptionService.validateCode('INVALID123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('找不到此兌換代碼');
      expect(result.errorCode).toBe('INVALID_CODE');
      expect(result.data.isValid).toBe(false);
    });

    test('should return success for valid codes', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: {
            code: 'VALID123',
            isValid: true,
            canRedeem: true,
            summary: '代碼有效，可以兌換',
            errors: [],
            warnings: [],
            eligibility: { eligible: true },
            benefits: { type: 'discount', amount: 10 }
          },
          message: '代碼有效，可以兌換'
        }
      };

      mockEnhancedApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await redemptionService.validateCode('VALID123');
      
      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.canRedeem).toBe(true);
    });
  });

  describe('Cache Management', () => {
    test('should cache successful responses', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: { items: [], total: 0 }
        }
      };

      mockEnhancedApiClient.get.mockResolvedValueOnce(mockResponse);

      // First call should hit API
      const result1 = await redemptionService.getRedemptionHistory();
      expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(1);
      expect(result1.success).toBe(true);

      // Second call should use cache
      const result2 = await redemptionService.getRedemptionHistory();
      expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(1); // Still 1
      expect(result2.success).toBe(true);
      expect(result2.fromCache).toBe(true);
    });

    test('should clear cache after successful redemption', async () => {
      const mockHistoryResponse = {
        data: { status: 'success', data: { items: [] } }
      };
      const mockRedeemResponse = {
        data: { status: 'success', data: { code: 'TEST123' } }
      };

      mockEnhancedApiClient.get.mockResolvedValue(mockHistoryResponse);
      mockEnhancedApiClient.post.mockResolvedValue(mockRedeemResponse);

      // Cache some data
      await redemptionService.getRedemptionHistory();
      expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(1);

      // Redeem code (should clear cache)
      await redemptionService.redeemCode('TEST123', true);

      // Next call should hit API again
      await redemptionService.getRedemptionHistory();
      expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Code Preview', () => {
    test('should preview code successfully', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: { 
            codeType: 'PERCENTAGE_DISCOUNT',
            benefits: { type: 'discount', amount: 10 }
          }
        }
      };

      mockEnhancedApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await redemptionService.previewRedemption('TEST123');
      
      expect(result.success).toBe(true);
      expect(result.data.codeType).toBe('PERCENTAGE_DISCOUNT');
      expect(mockEnhancedApiClient.post).toHaveBeenCalledWith('/api/redemption/preview', {
        code: 'TEST123'
      });
    });

    test('should handle preview errors', async () => {
      const mockError = {
        response: { 
          status: 400, 
          data: { 
            message: 'Invalid code',
            code: 'INVALID_CODE'
          } 
        }
      };

      mockEnhancedApiClient.post.mockRejectedValueOnce(mockError);

      const result = await redemptionService.previewRedemption('INVALID');
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_CODE');
    });
  });

  describe('Code Redemption', () => {
    test('should redeem code successfully', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: { 
            code: 'TEST123',
            benefits: { type: 'discount', amount: 10 }
          }
        }
      };

      mockEnhancedApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await redemptionService.redeemCode('TEST123', true);
      
      expect(result.success).toBe(true);
      expect(result.data.code).toBe('TEST123');
      expect(mockEnhancedApiClient.post).toHaveBeenCalledWith('/api/redemption/redeem', {
        code: 'TEST123',
        confirmed: true
      });
    });

    test('should handle redemption errors', async () => {
      const mockError = {
        response: { 
          status: 400, 
          data: { 
            message: 'Code expired',
            code: 'CODE_EXPIRED'
          } 
        }
      };

      mockEnhancedApiClient.post.mockRejectedValueOnce(mockError);

      const result = await redemptionService.redeemCode('EXPIRED123', true);
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CODE_EXPIRED');
    });
  });

  describe('Code Validation', () => {
    test('should validate code and cache results', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: { 
            code: 'TEST123',
            isValid: true, 
            canRedeem: true,
            codeType: 'PERCENTAGE_DISCOUNT',
            summary: '代碼有效，可以兌換',
            errors: [],
            warnings: [],
            eligibility: { eligible: true },
            benefits: { type: 'discount', amount: 10 }
          }
        }
      };

      mockEnhancedApiClient.get.mockResolvedValueOnce(mockResponse);

      // First call should hit API
      const result1 = await redemptionService.validateCode('TEST123');
      expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(1);
      expect(result1.success).toBe(true);

      // Second call should use cache
      const result2 = await redemptionService.validateCode('TEST123');
      expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(1);
      expect(result2.fromCache).toBe(true);
    });

    test('should normalize code format', async () => {
      const mockResponse = {
        data: { 
          status: 'success', 
          data: { 
            code: 'TEST123',
            isValid: true,
            canRedeem: true,
            summary: '代碼有效，可以兌換',
            errors: [],
            warnings: [],
            eligibility: { eligible: true },
            benefits: { type: 'discount', amount: 10 }
          } 
        }
      };

      mockEnhancedApiClient.get.mockResolvedValueOnce(mockResponse);

      await redemptionService.validateCode('  test123  ');
      
      expect(mockEnhancedApiClient.get).toHaveBeenCalledWith(
        '/api/redemption/validate/TEST123'
      );
    });
  });

  describe('Active Promotions', () => {
    test('should fetch and cache active promotions', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: [
            { id: '1', type: 'discount', amount: 10 },
            { id: '2', type: 'extension', days: 30 }
          ]
        }
      };

      mockEnhancedApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await redemptionService.getActivePromotions();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockEnhancedApiClient.get).toHaveBeenCalledWith('/api/redemption/active-promotions');
    });

    test('should force refresh when requested', async () => {
      const mockResponse = {
        data: { status: 'success', data: [] }
      };

      mockEnhancedApiClient.get.mockResolvedValue(mockResponse);

      // First call to populate cache
      await redemptionService.getActivePromotions();
      expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(1);

      // Force refresh should bypass cache
      await redemptionService.getActivePromotions(true);
      expect(mockEnhancedApiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('should format error messages correctly', () => {
      const mockT = jest.fn((key) => {
        const translations = {
          'redemption.errors.invalid_code': 'Invalid redemption code',
          'redemption.errors.unknown': 'Unknown error occurred'
        };
        return translations[key] || key;
      });

      const error = {
        errorCode: 'INVALID_CODE',
        error: 'Code not found'
      };

      const formatted = redemptionService.formatErrorMessage(error, mockT);
      expect(formatted).toBe('Invalid redemption code');
    });

    test('should identify error action requirements', () => {
      const paymentError = { errorCode: 'PAYMENT_METHOD_REQUIRED' };
      const confirmationError = { errorCode: 'CONFIRMATION_REQUIRED' };
      const eligibilityError = { errorCode: 'ELIGIBILITY_FAILED' };

      expect(redemptionService.getErrorActionRequirements(paymentError))
        .toEqual({ requiresPaymentMethod: true });
      
      expect(redemptionService.getErrorActionRequirements(confirmationError))
        .toEqual({ requiresConfirmation: true });
      
      expect(redemptionService.getErrorActionRequirements(eligibilityError))
        .toEqual({ showEligibilityInfo: true });
    });
  });

  describe('Cache Statistics', () => {
    test('should provide cache statistics', async () => {
      const mockResponse = {
        data: { status: 'success', data: {} }
      };

      mockEnhancedApiClient.get.mockResolvedValue(mockResponse);

      // Add some cached data
      await redemptionService.getRedemptionHistory();
      await redemptionService.getActivePromotions();
      await redemptionService.validateCode('TEST123');

      const stats = redemptionService.getCacheStats();
      
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.byType).toHaveProperty('redemptionHistory');
      expect(stats.byType).toHaveProperty('activePromotions');
      expect(stats.byType).toHaveProperty('codeValidation');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      redemptionService.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(redemptionService.getCacheStats().totalEntries).toBe(0);
    });
  });
});