const { test, expect } = require('@playwright/test');

async function installIsolatedApiMocks(page) {
  const requests = [];
  const productionApiAttempts = [];
  const mutationAttempts = [];
  const externalNetworkAttempts = [];

  // Browser tests must be hermetic: allow only the local CRA server. This
  // prevents accidental calls to production, staging, Google, analytics, or
  // any other external service while the browser is under test.
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port === '4173') {
      await route.fallback();
      return;
    }

    externalNetworkAttempts.push(`${url.origin}${url.pathname}`);
    if (url.pathname.startsWith('/api/')) {
      productionApiAttempts.push(`${route.request().method().toUpperCase()} ${url.origin}${url.pathname}`);
    }
    await route.abort('blockedbyclient');
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const isLocalMockApi = url.hostname === '127.0.0.1'
      && url.pathname.startsWith('/__mock_api__/api/');

    if (!isLocalMockApi) {
      productionApiAttempts.push(`${method} ${url.origin}${url.pathname}`);
      await route.abort('blockedbyclient');
      return;
    }

    requests.push(`${method} ${url.pathname}${url.search}`);

    if (!['GET', 'HEAD'].includes(method)) {
      mutationAttempts.push(`${method} ${url.pathname}`);
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Writes are disabled in browser tests.' })
      });
      return;
    }

    const apiPath = url.pathname.replace('/__mock_api__/api', '');
    let body = { success: false, data: {} };

    if (apiPath === '/auth/status') {
      body = { data: { isAuthenticated: false, user: null } };
    } else if (apiPath === '/hot-searches') {
      body = { data: { data: { top_searches: [] } } };
    } else if (apiPath === '/public/free-stock-list/regions') {
      body = {
        success: true,
        data: {
          americas: { title: '美洲市場', icon: '🌎', stocks: [{ ticker: 'SPY', name: 'SPDR S&P 500 ETF' }] },
          europe: { title: '歐洲市場', icon: '🇪🇺', stocks: [] },
          asiaPacific: { title: '亞太市場', icon: '🌏', stocks: [] },
          global: { title: '全球市場', icon: '🌍', stocks: [] }
        }
      };
    } else if (apiPath === '/public/free-stock-list/tickers') {
      body = { success: true, data: { tickers: ['SPY'] } };
    } else if (apiPath === '/integrated-analysis') {
      // The browser receives Axios response.data directly, so the API payload
      // must be wrapped once (the extra wrapper belongs to Jest Axios mocks).
      body = {
        data: {
          stockCode: url.searchParams.get('stockCode') || 'SPY',
          dates: ['2026-11-20', '2026-11-21', '2026-11-24'],
          prices: [670, 672, 675],
          sdAnalysis: {
            trendLine: [668, 670, 672],
            tl_minus_2sd: [620, 622, 624],
            tl_minus_sd: [644, 646, 648],
            tl_plus_sd: [692, 694, 696],
            tl_plus_2sd: [716, 718, 720]
          },
          weeklyDates: ['2026-11-20', '2026-11-21', '2026-11-24'],
          weeklyPrices: [670, 672, 675],
          upperBand: [692, 694, 696],
          lowerBand: [644, 646, 648],
          ma20: [668, 670, 672],
          currentPrice: 675,
          currentPricePosition: 0,
          sentiment: { key: 'sentiment.neutral', value: 'Neutral' }
        }
      };
    } else if (apiPath === '/market-sentiment-free') {
      body = {
        totalScore: 52,
        compositeScoreLastUpdate: '2026-11-27',
        isRestricted: false,
        indicators: {
          'AAII Bull-Bear Spread': { percentileRank: 65, value: 12.5, weight: 1.5 }
        },
        comparisonSnapshots: {}
      };
    } else if (apiPath === '/tw-market-sentiment-free') {
      body = {
        totalScore: 57,
        compositeScoreLastUpdate: '2026-11-27',
        isRestricted: false,
        indicators: {
          tw_vix: { id: 'tw_vix', label: '台指選擇權波動率', percentileRank: 35, value: 18.2, weight: 3 }
        },
        comparisonSnapshots: {}
      };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body)
    });
  });

  return { requests, productionApiAttempts, mutationAttempts, externalNetworkAttempts };
}

function expectNetworkIsolation(network) {
  expect(network.productionApiAttempts).toEqual([]);
  expect(network.mutationAttempts).toEqual([]);
  // Google Identity is referenced by the real sign-in dialog. The catch-all
  // route aborts it before any network connection is made; no other external
  // request is permitted during these local-only tests.
  expect(network.externalNetworkAttempts.filter((url) => (
    url !== 'https://accounts.google.com/gsi/client'
  ))).toEqual([]);
}

test.describe('Frontend browser smoke tests', () => {
  test('homepage renders and its public price-analysis link is available', async ({ page }) => {
    const network = await installIsolatedApiMocks(page);

    await page.goto('/zh-TW/');

    await expect(page.locator('.home-hero h1')).toBeVisible();
    const priceAnalysisLink = page.locator('a.home-hero__action--secondary');
    await expect(priceAnalysisLink).toBeVisible();
    await expect(priceAnalysisLink).toHaveAttribute('href', /\/zh-TW\/priceanalysis/);

    expect(network.requests.some((request) => request.endsWith('/api/auth/status'))).toBe(true);
    expectNetworkIsolation(network);
  });

  test('guest US market-sentiment page renders the public summary shell', async ({ page }) => {
    const network = await installIsolatedApiMocks(page);

    await page.goto('/en/market-sentiment');

    const tabs = page.getByRole('tab');
    await expect(tabs.nth(0)).toBeVisible();
    await expect(tabs.nth(1)).toBeVisible();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    expect(network.requests.some((request) => request.includes('/api/market-sentiment-free'))).toBe(true);
    expectNetworkIsolation(network);
  });

  test('guest Taiwan market-sentiment page renders its public summary shell', async ({ page }) => {
    const network = await installIsolatedApiMocks(page);

    await page.goto('/zh-TW/tw-market-sentiment');

    await expect(page.getByRole('tab').nth(0)).toBeVisible();
    await expect(page.getByRole('tab').nth(1)).toBeVisible();
    expect(network.requests.some((request) => request.includes('/api/tw-market-sentiment-free'))).toBe(true);
    expectNetworkIsolation(network);
  });

  test('Price Analysis renders the public SPY result and gates a different stock for guests', async ({ page }) => {
    const network = await installIsolatedApiMocks(page);

    await page.goto('/zh-TW/priceanalysis?stockCode=SPY&years=3.5');

    await expect(page.getByPlaceholder(/2330.*AAPL/i)).toBeVisible();
    await expect(page.locator('.chart-card')).toBeVisible();
    await expect(page.locator('.chart-card canvas').first()).toBeVisible();
    await expect(page.getByText('發生未知錯誤')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(network.requests.some((request) => request.includes('/api/integrated-analysis'))).toBe(true);

    const initialAnalysisRequests = network.requests
      .filter((request) => request.includes('/api/integrated-analysis')).length;
    const stockInput = page.getByPlaceholder(/2330.*AAPL/i);
    await stockInput.fill('AAPL');
    await stockInput.press('Enter');
    await expect(stockInput).toHaveValue('AAPL');
    await expect(page.locator('.auth-entry-dialog')).toBeVisible();
    await expect(page.locator('.auth-entry-dialog__benefits li')).toHaveCount(3);
    expect(network.requests.filter((request) => request.includes('/api/integrated-analysis')))
      .toHaveLength(initialAnalysisRequests);
    expect(network.requests.some((request) => (
      request.includes('/api/integrated-analysis') && /[?&]stockCode=AAPL(?:&|$)/i.test(request)
    ))).toBe(false);
    expectNetworkIsolation(network);
  });

  test('unauthenticated Watchlist visits retain the requested URL and open sign-in dialog', async ({ page }) => {
    const network = await installIsolatedApiMocks(page);

    await page.goto('/zh-TW/watchlist');

    await expect(page).toHaveURL(/\/zh-TW\/watchlist$/);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.auth-entry-dialog__benefits li')).toHaveCount(3);
    expectNetworkIsolation(network);
  });

  test('unauthenticated payment visits are gated before payment content is mounted', async ({ page }) => {
    const network = await installIsolatedApiMocks(page);

    await page.goto('/zh-TW/payment');

    await expect(page).toHaveURL(/\/zh-TW\/payment$/);
    await expect(page.getByRole('dialog')).toBeVisible();
    expectNetworkIsolation(network);
  });
});
