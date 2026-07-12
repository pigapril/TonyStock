#!/usr/bin/env node
/**
 * Generates per-route static HTML shells under build/<path>/index.html so
 * crawlers and link-preview bots get correct <title>/description/canonical/
 * hreflang on the very first response, without waiting for the React app to
 * hydrate. Netlify serves a matching build/<path>/index.html file ahead of
 * the catch-all redirect (no `force`), so this "just works" once the files
 * exist on disk.
 *
 * Every injected tag carries data-rh="true" so react-helmet-async recognizes
 * it as one of its own on hydration and replaces it instead of duplicating it.
 *
 * Run via `npm run build` (wired as the `postbuild` script).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://sentimentinsideout.com').replace(/\/$/, '');

const en = require(path.join(ROOT, 'src/locales/en/translation.json'));
const zhTW = require(path.join(ROOT, 'src/locales/zh-TW/translation.json'));

// There is no src/locales/zh/translation.json in this repo, and i18n.js only
// registers `en` and `zh-TW` resource bundles (zh falls back to zh-TW/en at
// runtime). Rather than inventing an unused zh locale file, the zh shells
// reuse the zh-TW strings, same as the runtime i18next fallback chain would.
const STRINGS = { en, 'zh-TW': zhTW, zh: zhTW };

const LANGS = ['en', 'zh-TW', 'zh'];

// basePath '' = the language home page (self URL gets a trailing slash,
// matching the existing sitemap.xml convention).
const ROUTES = [
  { basePath: '', metaKey: 'home' },
  { basePath: '/priceanalysis', metaKey: 'priceAnalysis' },
  { basePath: '/market-sentiment', metaKey: 'marketSentiment' },
  { basePath: '/watchlist', metaKey: 'watchlist' },
  { basePath: '/articles', metaKey: 'articles' },
  { basePath: '/sponsor-us', metaKey: 'sponsorUs' },
  { basePath: '/about', metaKey: 'about' },
  { basePath: '/legal', metaKey: 'legal' },
];

// Article detail shells: sourced from what's actually in sitemap.xml today.
// Only en + zh-TW slugs are confirmed real URLs. A `zh` article cluster is
// intentionally skipped: there is no zh-specific slug mapping anywhere in the
// app (ArticleDetail.js only maps zh-TW original slugs <-> en slugs), so a
// fabricated /zh/articles/<slug> URL would be a guess, not a fact.
const ARTICLES = [
  { lang: 'en', slug: 'analyzing-price-trends-and-sentiment-with-lohas-five-line-analysis' },
  { lang: 'en', slug: 'using-market-sentiment-composite-index-to-time-buys-and-sells' },
  { lang: 'zh-TW', slug: '1.用樂活五線譜分析價格趨勢與情緒' },
  { lang: 'zh-TW', slug: '2.用市場情緒綜合指數判斷買賣時機' },
];

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ogLocale(lang) {
  return lang.replace('-', '_');
}

function selfUrl(lang, basePath) {
  return basePath === '' ? `${SITE_ORIGIN}/${lang}/` : `${SITE_ORIGIN}/${lang}${basePath}`;
}

function defaultTitle(lang) {
  return STRINGS[lang].pageContainer.defaultTitle;
}

// build/index.html is also one of our own output targets (the bare "/"
// shell overwrites it in place). If this script is ever re-run without an
// intervening fresh `react-app-rewired build`, the "pristine" template it
// reads back would already carry a previous run's injected tags. Strip
// anything we previously injected (marked with data-rh="true") so repeated
// runs stay idempotent instead of duplicating tags.
function stripPreviousInjection(html) {
  return html
    .replace(/<title data-rh="true">[^<]*<\/title>/, '<title></title>')
    .replace(/\s*<(?:meta|link)\b[^>]*\bdata-rh="true"[^>]*\/>/g, '');
}

// Renders a full shell document from the pristine build/index.html template.
// `title` is the exact <title> text; `ogTitle` is used for og:title/twitter:title
// (PageContainer.js renders these two differently: <title> gets the
// " | {defaultTitle}" suffix, og/twitter title stays unsuffixed).
function renderShell(rawTemplate, { lang, title, ogTitle, description, selfHref, hreflangLinks }) {
  const template = stripPreviousInjection(rawTemplate);

  let html = template.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title data-rh="true">${escapeAttr(title)}</title>`);

  const tags = [
    `<meta data-rh="true" name="description" content="${escapeAttr(description)}" />`,
    `<meta data-rh="true" property="og:title" content="${escapeAttr(ogTitle)}" />`,
    `<meta data-rh="true" property="og:description" content="${escapeAttr(description)}" />`,
    `<meta data-rh="true" property="og:url" content="${escapeAttr(selfHref)}" />`,
    `<meta data-rh="true" property="og:locale" content="${ogLocale(lang)}" />`,
    `<meta data-rh="true" name="twitter:card" content="summary_large_image" />`,
    `<meta data-rh="true" name="twitter:title" content="${escapeAttr(ogTitle)}" />`,
    `<meta data-rh="true" name="twitter:description" content="${escapeAttr(description)}" />`,
    `<link data-rh="true" rel="canonical" href="${escapeAttr(selfHref)}" />`,
    ...hreflangLinks.map(
      ({ hreflang, href }) => `<link data-rh="true" rel="alternate" hreflang="${hreflang}" href="${escapeAttr(href)}" />`
    ),
  ];

  return html.replace('</head>', `${tags.join('\n    ')}\n  </head>`);
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function main() {
  const indexPath = path.join(BUILD_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('generate-seo-shells: build/index.html not found. Run `react-app-rewired build` first.');
    process.exit(1);
  }

  // A previous run overwrites build/index.html in place with the root shell,
  // so after the first run the pristine template only survives as
  // __spa__.html. A fresh `react-app-rewired build` wipes build/, so right
  // after a build __spa__.html is absent and index.html is the pristine
  // source. Preferring __spa__.html keeps re-runs idempotent.
  const spaPath = path.join(BUILD_DIR, '__spa__.html');
  const template = fs.existsSync(spaPath)
    ? fs.readFileSync(spaPath, 'utf8')
    : fs.readFileSync(indexPath, 'utf8');
  const written = [];

  // Pristine copy used as the Netlify catch-all fallback for any route that
  // doesn't get its own shell (see netlify.toml). stripPreviousInjection is a
  // no-op on a truly pristine template; it only bites if a stale injected
  // index.html ever slips through as the template source.
  writeFile(spaPath, stripPreviousInjection(template));
  written.push(spaPath);

  // Per-language x per-route shells.
  for (const lang of LANGS) {
    for (const { basePath, metaKey } of ROUTES) {
      const meta = STRINGS[lang][metaKey];
      const ogTitle = meta.pageTitle;
      const title = `${ogTitle} | ${defaultTitle(lang)}`;
      const description = meta.pageDescription;
      const selfHref = selfUrl(lang, basePath);
      const xDefaultHref = basePath === '' ? `${SITE_ORIGIN}/` : selfUrl('en', basePath);

      const hreflangLinks = [
        ...LANGS.map((hLang) => ({ hreflang: hLang, href: selfUrl(hLang, basePath) })),
        { hreflang: 'x-default', href: xDefaultHref },
      ];

      const html = renderShell(template, { lang, title, ogTitle, description, selfHref, hreflangLinks });
      const outPath =
        basePath === ''
          ? path.join(BUILD_DIR, lang, 'index.html')
          : path.join(BUILD_DIR, lang, ...basePath.split('/').filter(Boolean), 'index.html');

      writeFile(outPath, html);
      written.push(outPath);
    }
  }

  // Article detail shells: self-canonical only, no hreflang alternates.
  for (const { lang, slug } of ARTICLES) {
    const decodedSlug = decodeURIComponent(slug);
    // Single formula for the article title (no extra " | {defaultTitle}" suffix
    // layered on top) — used as-is for both <title> and og:title/twitter:title.
    const title = `${decodedSlug} | Sentiment Inside Out`;
    const description = STRINGS[lang].articles.pageDescription;
    const selfHref = `${SITE_ORIGIN}/${lang}/articles/${encodeURIComponent(decodedSlug)}`;

    const html = renderShell(template, { lang, title, ogTitle: title, description, selfHref, hreflangLinks: [] });
    const outPath = path.join(BUILD_DIR, lang, 'articles', decodedSlug, 'index.html');

    writeFile(outPath, html);
    written.push(outPath);
  }

  // Bare root ("/"): gets the English home meta injected directly into
  // build/index.html itself (Netlify serves this for a literal "/" request
  // before the catch-all redirect is ever consulted).
  {
    const ogTitle = STRINGS.en.home.pageTitle;
    const title = `${ogTitle} | ${defaultTitle('en')}`;
    const description = STRINGS.en.home.pageDescription;
    const selfHref = `${SITE_ORIGIN}/`;
    const hreflangLinks = [
      ...LANGS.map((hLang) => ({ hreflang: hLang, href: selfUrl(hLang, '') })),
      { hreflang: 'x-default', href: `${SITE_ORIGIN}/` },
    ];

    const html = renderShell(template, { lang: 'en', title, ogTitle, description, selfHref, hreflangLinks });
    writeFile(indexPath, html);
    written.push(indexPath);
  }

  console.log(`generate-seo-shells: wrote ${written.length} files under build/.`);

  checkSitemapCoverage();
}

// Every non-verification URL in sitemap.xml must resolve to a shell file we
// just generated. Catches route-table/sitemap drift at build time instead of
// silently shipping a stale shell set.
function checkSitemapCoverage() {
  const sitemapPath = path.join(ROOT, 'public/sitemap.xml');
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const missing = [];
  let checkedCount = 0;
  for (const loc of locs) {
    const url = new URL(loc);
    const pathname = url.pathname;

    // Skip non-lang-prefixed entries (e.g. the Google Search Console
    // verification file) — they don't get an SEO shell.
    if (!/^\/(en|zh-TW|zh)(\/|$)/.test(pathname)) continue;
    checkedCount += 1;

    const decodedPathname = decodeURIComponent(pathname);
    const expectedFile = path.join(BUILD_DIR, decodedPathname, 'index.html');

    if (!fs.existsSync(expectedFile)) {
      missing.push({ loc, expectedFile });
    }
  }

  if (missing.length > 0) {
    console.error(`generate-seo-shells: ${missing.length} sitemap URL(s) have no matching shell:`);
    for (const { loc, expectedFile } of missing) {
      console.error(`  - ${loc}\n    expected: ${expectedFile}`);
    }
    process.exit(1);
  }

  console.log(`generate-seo-shells: sitemap coverage check passed (${checkedCount} URLs checked).`);
}

main();
