jest.mock('../enhancedApiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() }
}));

const enhancedApiClient = require('../enhancedApiClient').default;
const {
  clearCache,
  getFreeStockList,
  getFreeStockTickers,
  isStockAllowed
} = require('../freeStockListUtils');

describe('freeStockListUtils fail-closed behavior', () => {
  beforeEach(() => {
    clearCache();
    jest.clearAllMocks();
  });

  it('does not grant hard-coded stock access before the server list is loaded', () => {
    expect(getFreeStockList()).toEqual([]);
    expect(isStockAllowed('0050', 'free')).toBe(false);
    expect(isStockAllowed('SPY', 'free')).toBe(false);
    expect(isStockAllowed('VOO', 'free')).toBe(false);
    expect(isStockAllowed('AAPL', 'pro')).toBe(true);
  });

  it('returns an empty list and clears stale cache when the server list cannot be loaded', async () => {
    enhancedApiClient.get.mockRejectedValue(new Error('API unavailable'));

    await expect(getFreeStockTickers()).resolves.toEqual([]);
    expect(getFreeStockList()).toEqual([]);
    expect(isStockAllowed('0050', 'free')).toBe(false);
  });
});
