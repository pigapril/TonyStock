import {
  buildAnalysisReturnPath,
  getAnalysisReturnPath,
  withAnalysisReturnPath
} from '../trialNavigation';

const returnSearch = (returnTo) => `?${new URLSearchParams({ returnTo })}`;

describe('analysis context through the trial flow', () => {
  test.each([
    ['en', 'en'],
    ['en-US', 'en'],
    ['zh-TW', 'zh-TW']
  ])('preserves stock, years and date in the %s interface', (language, routeLanguage) => {
    expect(buildAnalysisReturnPath(language, {
      stockCode: ' aapl ',
      years: '3.5',
      backTestDate: '2026-10-14'
    })).toBe(`/${routeLanguage}/priceanalysis?stockCode=AAPL&years=3.5&backTestDate=2026-10-14`);
  });

  test('preserves supported index symbols and a real leap day', () => {
    const path = buildAnalysisReturnPath('en', {
      stockCode: '^gspc', years: 5, backTestDate: '2024-02-29'
    });
    expect(path).toBe('/en/priceanalysis?stockCode=%5EGSPC&years=5&backTestDate=2024-02-29');
  });

  test.each([
    { stockCode: 'https://example.com', years: '-1', backTestDate: 'yesterday' },
    { stockCode: 'AAPL&token=example', years: 'Infinity', backTestDate: '2026/10/14' },
    { stockCode: 'A'.repeat(33), years: 'NaN', backTestDate: '2026-13-40' },
    { stockCode: ' ', years: 0, backTestDate: '2025-02-29' }
  ])('omits invalid analysis parameters: %j', (parameters) => {
    expect(buildAnalysisReturnPath('en', parameters)).toBe('/en/priceanalysis');
  });

  test('does not add a query for an empty analysis context', () => {
    expect(buildAnalysisReturnPath('zh-TW')).toBe('/zh-TW/priceanalysis');
  });

  test.each([
    ['en', 'zh-TW'],
    ['zh-TW', 'en']
  ])('returns to the current %s interface from a saved %s route', (language, savedLanguage) => {
    const savedPath = `/${savedLanguage}/priceanalysis?stockCode=BRK.B&years=10&backTestDate=2026-10-14`;
    expect(getAnalysisReturnPath(returnSearch(savedPath), language))
      .toBe(`/${language}/priceanalysis?stockCode=BRK.B&years=10&backTestDate=2026-10-14`);
  });

  test('forwards only analysis inputs, stripping unknown queries and tokens', () => {
    const savedPath = '/en/priceanalysis?stockCode=NVDA&years=3.5&backTestDate=2026-10-14'
      + '&token=example-secret&access_token=example-access&email=test%40example.com&utm_source=ad';
    const search = `${returnSearch(savedPath)}&token=outer-example-secret`;
    const returnedPath = getAnalysisReturnPath(search, 'en');
    expect(returnedPath).toBe('/en/priceanalysis?stockCode=NVDA&years=3.5&backTestDate=2026-10-14');
    expect(withAnalysisReturnPath('/en/payment/free-trial', returnedPath))
      .not.toMatch(/token|secret|email|utm_source/);
  });

  test('sanitizes invalid parameters in an otherwise allowed return path', () => {
    expect(getAnalysisReturnPath(returnSearch(
      '/en/priceanalysis?stockCode=AAPL&years=-2&backTestDate=2025-02-29'
    ), 'en')).toBe('/en/priceanalysis?stockCode=AAPL');
  });

  test.each([
    'https://example.com/en/priceanalysis?stockCode=AAPL',
    '//example.com/en/priceanalysis?stockCode=AAPL',
    'javascript:alert(1)',
    '/en/payment?plan=pro',
    '/zh-TW/subscription-plans',
    '/en/priceanalysis/../payment',
    '/en/priceanalysis/extra',
    '/en/priceanalysis?stockCode=AAPL#fragment'
  ])('rejects unsafe or unsupported return destinations: %s', (returnTo) => {
    expect(getAnalysisReturnPath(returnSearch(returnTo), 'en')).toBeNull();
  });

  test('rejects an excessively long return destination', () => {
    const returnTo = `/en/priceanalysis?stockCode=${'A'.repeat(2048)}`;
    expect(getAnalysisReturnPath(returnSearch(returnTo), 'en')).toBeNull();
  });

  test.each(['', '?returnTo=', '?stockCode=AAPL&token=example-secret'])('has no context for %s', (search) => {
    expect(getAnalysisReturnPath(search, 'en')).toBeNull();
  });

  test('encodes and recovers the full analysis context through a forward path', () => {
    const analysisPath = '/en/priceanalysis?stockCode=AAPL&years=3.5&backTestDate=2026-10-14';
    const forwardPath = withAnalysisReturnPath('/en/payment/free-trial', analysisPath);
    expect(forwardPath).toBe('/en/payment/free-trial?returnTo=%2Fen%2Fpriceanalysis'
      + '%3FstockCode%3DAAPL%26years%3D3.5%26backTestDate%3D2026-10-14');
    expect(getAnalysisReturnPath(forwardPath.slice(forwardPath.indexOf('?')), 'en')).toBe(analysisPath);
  });

  test.each([undefined, null, ''])('leaves the destination unchanged without context (%s)', (context) => {
    expect(withAnalysisReturnPath('/en/subscription-plans', context)).toBe('/en/subscription-plans');
    expect(withAnalysisReturnPath('/zh-TW/payment/free-trial?source=home', context))
      .toBe('/zh-TW/payment/free-trial?source=home');
  });
});
