export const HOT_SEARCH_CACHE_KEY = 'sio:hot-searches:v1';

export const normalizeHotSearches = (items) => {
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  return items.reduce((result, item) => {
    const keyword = typeof item?.keyword === 'string' ? item.keyword.trim() : '';
    const normalizedKeyword = keyword.toUpperCase();
    if (!keyword || seen.has(normalizedKeyword) || result.length >= 10) return result;

    seen.add(normalizedKeyword);
    result.push({
      keyword,
      name: typeof item.name === 'string' ? item.name : keyword
    });
    return result;
  }, []);
};

export const readHotSearchesCache = () => {
  try {
    return normalizeHotSearches(JSON.parse(window.localStorage.getItem(HOT_SEARCH_CACHE_KEY)));
  } catch (error) {
    return [];
  }
};

export const saveHotSearchesCache = (items) => {
  const searches = normalizeHotSearches(items);
  if (searches.length === 0) return;

  try {
    window.localStorage.setItem(HOT_SEARCH_CACHE_KEY, JSON.stringify(searches));
  } catch (error) {
    // 私密瀏覽或儲存空間不足時，當次 API 結果仍可顯示。
  }
};
