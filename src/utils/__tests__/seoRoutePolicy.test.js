import { isNonIndexableRoute } from '../seoRoutePolicy';

describe('isNonIndexableRoute', () => {
  test.each([
    ['/ko-KR/watchlist', 'ko-KR'],
    ['/zh-CN/watchlist/', 'zh-CN'],
    ['/en/user-account', 'en'],
    ['/zh-TW/subscription-plans/', 'zh-TW'],
    ['/ko-KR/sponsor-success', 'ko-KR'],
    ['/en/payment', 'en'],
    ['/en/payment/card-trial/result/', 'en'],
    ['/ko-KR/payment/card-update/result', 'ko-KR'],
    ['/zh-CN/google-trends/symbol/AAPL', 'zh-CN'],
    ['/en/NK-Admin/', 'en'],
    ['/zh-TW/NK-Admin-diagnostic', 'zh-TW'],
  ])('marks private or transactional route %s as noindex', (pathname, locale) => {
    expect(isNonIndexableRoute(pathname, locale)).toBe(true);
  });

  test.each([
    ['/ko-KR/', 'ko-KR'],
    ['/ko-KR/priceanalysis/', 'ko-KR'],
    ['/zh-CN/market-sentiment', 'zh-CN'],
    ['/en/articles/market-momentum-dashboard-guide/', 'en'],
  ])('leaves public content route %s indexable', (pathname, locale) => {
    expect(isNonIndexableRoute(pathname, locale)).toBe(false);
  });
});
