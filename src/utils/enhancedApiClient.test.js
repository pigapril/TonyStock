jest.mock('../api/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

jest.mock('./authGuard', () => ({
  __esModule: true,
  default: {
    makeAuthenticatedRequest: jest.fn(async (requestFn) => requestFn()),
    isInitializing: jest.fn(() => false)
  }
}));

import enhancedApiClient from './enhancedApiClient';

describe('enhancedApiClient request deduplication keys', () => {
  afterEach(() => {
    enhancedApiClient.clearQueue();
  });

  it('creates distinct keys for different indicator params on the same endpoint', () => {
    const aaiiKey = enhancedApiClient._createRequestKey('get', '/api/indicator-history', undefined, {
      params: { indicator: 'AAII Bull-Bear Spread' }
    });
    const vixKey = enhancedApiClient._createRequestKey('get', '/api/indicator-history', undefined, {
      params: { indicator: 'VIX MA50' }
    });
    const naaimKey = enhancedApiClient._createRequestKey('get', '/api/indicator-history', undefined, {
      params: { indicator: 'NAAIM Exposure Index' }
    });
    const cotKey = enhancedApiClient._createRequestKey('get', '/api/indicator-history', undefined, {
      params: { indicator: 'S&P 500 COT Index' }
    });

    expect(aaiiKey).not.toBe(vixKey);
    expect(aaiiKey).not.toBe(naaimKey);
    expect(aaiiKey).not.toBe(cotKey);
    expect(vixKey).not.toBe(naaimKey);
    expect(vixKey).not.toBe(cotKey);
    expect(naaimKey).not.toBe(cotKey);
  });

  it('keeps the key stable for identical requests', () => {
    const firstKey = enhancedApiClient._createRequestKey('get', '/api/indicator-history', undefined, {
      params: { indicator: 'VIX MA50' }
    });
    const secondKey = enhancedApiClient._createRequestKey('get', '/api/indicator-history', undefined, {
      params: { indicator: 'VIX MA50' }
    });

    expect(firstKey).toBe(secondKey);
  });
});
