#!/usr/bin/env node
/**
 * Expanded crawler: exhaustive route + interaction coverage.
 *
 * Per page:
 *   - scroll to bottom to trigger lazy-loaded sections
 *   - click every button / [role="tab"] / [role="button"] / link (in-page)
 *   - hover over nav items to open dropdowns
 *   - focus/blur every input (triggers validation messages)
 *   - re-collect missing keys after each wave
 *
 * Reads dev-instrumented globals window.__i18nMissingKeys__ and
 * window.__i18nCalledKeys__ (see src/i18n.js).
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.CRAWL_BASE || 'http://localhost:3000';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.resolve(__dirname, '..', 'missing-i18n-runtime.json');

const ROUTES = [
  '',
  'priceanalysis',
  'market-sentiment',
  'tw-market-sentiment',
  'about',
  'legal',
  'articles',
  'articles/nonexistent-slug-for-error-state',
  'subscription-plans',
  'sponsor-us',
  'sponsor-success',
  'payment/result',
  'watchlist',
  'user-account',
  'payment',
  'payment/flow',
  'payment/status',
  'google-trends/market',
  'google-trends/symbol/AAPL',
  'NK-Admin',
  'definitely-not-a-real-route-404-test',
];
const LANGS = ['en', 'zh-TW'];

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function collectMissing(page) {
  return await page.evaluate(() => window.__i18nMissingKeys__ || {});
}

async function collectCalled(page) {
  return await page.evaluate(() => [...(window.__i18nCalledKeys__ || [])]);
}

async function scrollToBottom(page) {
  try {
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let y = 0;
        const step = () => {
          y += 400;
          window.scrollTo(0, y);
          if (y < document.body.scrollHeight) setTimeout(step, 80);
          else { window.scrollTo(0, 0); resolve(); }
        };
        step();
      });
    });
  } catch {}
}

async function clickAll(page, selector, max = 40) {
  try {
    const handles = await page.$$(selector);
    const n = Math.min(handles.length, max);
    for (let i = 0; i < n; i++) {
      try {
        const h = handles[i];
        const box = await h.boundingBox().catch(() => null);
        if (!box) continue;
        await h.click({ delay: 20 }).catch(() => {});
        await wait(150);
      } catch {}
    }
  } catch {}
}

async function hoverAll(page, selector, max = 15) {
  try {
    const handles = await page.$$(selector);
    for (let i = 0; i < Math.min(handles.length, max); i++) {
      try { await handles[i].hover(); await wait(100); } catch {}
    }
  } catch {}
}

async function focusAll(page, selector, max = 20) {
  try {
    const handles = await page.$$(selector);
    for (let i = 0; i < Math.min(handles.length, max); i++) {
      try {
        await handles[i].focus();
        await handles[i].evaluate(el => el.blur());
        await wait(60);
      } catch {}
    }
  } catch {}
}

async function interact(page) {
  // Wave 1: scroll (exposes lazy content using different i18n keys)
  await scrollToBottom(page);
  await wait(300);

  // Wave 2: hover nav (dropdown menus)
  await hoverAll(page, 'nav a, nav button, [role="menu"] *', 10);
  await wait(200);

  // Wave 3: click tabs (reveals tab content with different t() calls)
  await clickAll(page, '[role="tab"], [data-tab], .tab-button, [class*="tab"]', 20);
  await wait(400);

  // Wave 4: click buttons that likely open dialogs (upgrade, subscribe, manage, etc.)
  await clickAll(page,
    'button[class*="upgrade"], button[class*="subscribe"], button[class*="manage"],' +
    'button[class*="Upgrade"], button[class*="Subscribe"], button[class*="Manage"],' +
    'button[data-testid*="upgrade"], button[data-testid*="subscribe"]',
    15);
  await wait(500);

  // Wave 5: click all remaining visible buttons (bounded)
  await clickAll(page, 'button:not([disabled])', 30);
  await wait(400);

  // Wave 6: focus/blur inputs (validation messages)
  await focusAll(page, 'input:not([type="hidden"]), textarea, select', 15);
  await wait(200);

  // Wave 7: click through sentiment/category/filter pills
  await clickAll(page, '[role="button"], [class*="pill"], [class*="chip"]', 20);
  await wait(400);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const aggregate = {};
  const allCalled = new Set();
  const results = [];

  for (const lang of LANGS) {
    for (const route of ROUTES) {
      const url = `${BASE}/${lang}/${route}`.replace(/\/+$/, '');
      const page = await browser.newPage();
      // Auto-dismiss native alerts/confirms that might block
      page.on('dialog', d => d.dismiss().catch(() => {}));
      await page.evaluateOnNewDocument(() => {
        window.__i18nMissingKeys__ = {};
        window.__i18nCalledKeys__ = new Set();
      });
      let error = null;
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(800);
        await interact(page);
        await wait(600);
      } catch (e) {
        error = e.message.slice(0, 120);
      }
      const missing = await collectMissing(page).catch(() => ({}));
      const called = await collectCalled(page).catch(() => []);
      called.forEach(k => allCalled.add(k));
      const count = Object.keys(missing).length;
      results.push({ url, missingCount: count, calledCount: called.length, error });
      for (const [id, hits] of Object.entries(missing)) {
        const [lng, ns, key] = id.split('::');
        if (!aggregate[id]) aggregate[id] = { key, lng, ns, count: 0, routes: new Set() };
        aggregate[id].count += hits;
        aggregate[id].routes.add(`${lang}/${route}`);
      }
      console.log(`[${lang}] /${route} — called: ${called.length}, missing: ${count}${error ? ' (ERR: ' + error + ')' : ''}`);
      await page.close();
    }
  }

  await browser.close();

  const report = {
    base: BASE,
    totalMissingKeys: Object.keys(aggregate).length,
    totalCalledKeys: allCalled.size,
    perRoute: results,
    calledKeys: [...allCalled].sort(),
    missingKeys: Object.values(aggregate)
      .map(({ key, lng, ns, count, routes }) => ({ key, lng, ns, count, routes: [...routes] }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${path.relative(process.cwd(), OUT)}`);
  console.log(`Unique called keys: ${report.totalCalledKeys}`);
  console.log(`Unique missing keys: ${report.totalMissingKeys}`);
})().catch(e => { console.error(e); process.exit(1); });
