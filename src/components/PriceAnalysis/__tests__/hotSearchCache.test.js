import {
  HOT_SEARCH_CACHE_KEY,
  normalizeHotSearches,
  readHotSearchesCache,
  saveHotSearchesCache
} from '../hotSearchCache';

beforeEach(() => {
  window.localStorage.removeItem(HOT_SEARCH_CACHE_KEY);
});

it('只快取十個有效且不重複的公開熱門項目', () => {
  const items = [
    { keyword: ' SPY ', name: 'S&P 500 ETF' },
    { keyword: 'spy', name: 'duplicate' },
    { keyword: '' },
    ...Array.from({ length: 12 }, (_, index) => ({ keyword: `S${index}` }))
  ];

  saveHotSearchesCache(items);
  const cached = readHotSearchesCache();
  expect(cached).toHaveLength(10);
  expect(cached[0]).toEqual({ keyword: 'SPY', name: 'S&P 500 ETF' });
  expect(normalizeHotSearches([])).toEqual([]);
});

it('空回應與損壞的本機資料不會清掉有效快取或造成例外', () => {
  saveHotSearchesCache([{ keyword: 'AAPL' }]);
  saveHotSearchesCache([]);
  expect(readHotSearchesCache()).toEqual([{ keyword: 'AAPL', name: 'AAPL' }]);

  window.localStorage.setItem(HOT_SEARCH_CACHE_KEY, '{broken');
  expect(readHotSearchesCache()).toEqual([]);
});
