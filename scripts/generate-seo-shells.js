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
const { DEFAULT_LOCALE, LOCALE_CODES, getLocaleResourceChain } = require('../src/locales/localeConfig');
const { resolveRequiredKeyFromChain } = require('../src/locales/localeKeyResolution');
const ARTICLE_CATALOG = require('../src/config/articleCatalog');

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = process.env.SEO_BUILD_DIR || path.join(ROOT, 'build');
const {
  SITE_ORIGIN: DEFAULT_SITE_ORIGIN,
  SITE_NAME,
  socialImagePath,
  buildSeoTitle,
  normalizeMetaDescription,
} = require('../src/utils/socialMetadata');
const imageDimensions = require('../src/config/articleImageDimensions.json');
const SITE_ORIGIN = (process.env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN).replace(/\/$/, '');

const STRINGS = Object.fromEntries(LOCALE_CODES.map(locale => [
  locale,
  require(path.join(ROOT, `src/locales/${locale}/translation.json`)),
]));


// indicatorPages.js 是 ESM，這支腳本是 CommonJS，所以用最小的字串解析取出
// slug / i18nKey / published，避免為了共用一份清單而引入編譯步驟。
const INDICATOR_PAGES = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'src/components/SentimentBoard/indicatorPages.js'), 'utf8');
  const body = src.slice(src.indexOf('INDICATOR_PAGES = ['), src.indexOf('];'));
  return [...body.matchAll(/\{([^{}]*)\}/g)].map(([, entry]) => ({
    slug: (entry.match(/slug:\s*'([^']+)'/) || [])[1],
    i18nKey: (entry.match(/i18nKey:\s*'([^']+)'/) || [])[1],
    published: /published:\s*true/.test(entry),
  })).filter((page) => page.slug && page.i18nKey);
})();

const LANGS = LOCALE_CODES;

function readLocaleValue(lang, key) {
  return resolveRequiredKeyFromChain(lang, key, STRINGS, getLocaleResourceChain).value;
}

// basePath '' = the language home page (self URL gets a trailing slash,
// matching the existing sitemap.xml convention).
const ROUTES = [
  { basePath: '', metaKey: 'home' },
  { basePath: '/priceanalysis', metaKey: 'priceAnalysis' },
  { basePath: '/sentiment-indicators', metaKey: 'sentimentBoard' },
  // 指標常青解說頁。清單直接從 indicatorPages.js 推導，避免兩邊各自長歪；
  // 只有 published: true 的會產生 shell。
  ...INDICATOR_PAGES.filter((page) => page.published).map((page) => ({
    basePath: `/sentiment-indicators/${page.slug}`,
    metaKey: `sentimentIndicatorPages.${page.i18nKey}`,
  })),
  { basePath: '/market-sentiment', metaKey: 'marketSentiment' },
  { basePath: '/tw-market-sentiment', metaKey: 'marketSentiment.tw' },
  { basePath: '/momentum', metaKey: 'momentumDashboard' },
  { basePath: '/articles', metaKey: 'articles' },
  // The sponsor page is Taiwan-specific and intentionally has no English
  // sitemap entry (see the existing public/sitemap.xml editorial decision).
  { basePath: '/sponsor-us', metaKey: 'sponsorUs', seoLocales: ['zh-TW'] },
  { basePath: '/about', metaKey: 'about' },
  { basePath: '/legal', metaKey: 'legal' },
];

// Article routes are emitted only for complete, published locale editions in
// the shared article catalog. The intentionally delisted Netflix article is
// absent from that catalog and remains excluded from SEO output.
const ARTICLES = ARTICLE_CATALOG.flatMap(({ id, originalSlug, locales }) => (
  Object.entries(locales).map(([lang, edition]) => ({
    id,
    lang,
    slug: edition.slug,
    originalSlug,
    sourceFile: path.join(ROOT, 'public/articles', originalSlug, edition.filename),
  }))
));

function articleFrontmatter(sourceFile) {
  const source = fs.readFileSync(sourceFile, 'utf8');
  const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
  if (!frontmatter) throw new Error(`Missing article frontmatter: ${sourceFile}`);
  const fields = {};
  for (const line of frontmatter[1].split('\n')) {
    const match = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (match) fields[match[1].toLowerCase()] = match[2].trim();
  }
  if (!fields.title || !fields.description) {
    throw new Error(`Missing article title or description: ${sourceFile}`);
  }
  return fields;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ogLocale(lang) {
  if (lang === 'en') return 'en_US';
  if (lang === 'zh-CN') return 'zh_CN';
  if (lang === 'ko-KR') return 'ko_KR';
  return 'zh_TW';
}

function selfUrl(lang, basePath) {
  return basePath === '' ? `${SITE_ORIGIN}/${lang}/` : `${SITE_ORIGIN}/${lang}${basePath}/`;
}

function defaultTitle(lang) {
  return readLocaleValue(lang, 'pageContainer.defaultTitle');
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
function renderShell(rawTemplate, { lang, title, ogTitle, description, selfHref, hreflangLinks, articleMarkup, articleJsonLd, articleImage, image, ogType = 'website' }) {
  const template = stripPreviousInjection(rawTemplate);
  const cleanDescription = normalizeMetaDescription(description);

  let html = template.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title data-rh="true">${escapeAttr(title)}</title>`);

  const shareImage = articleImage || `${SITE_ORIGIN}${image || socialImagePath('', lang)}`;
  const imageFile = path.join(ROOT, 'public', new URL(shareImage).pathname);
  if (!fs.existsSync(imageFile)) throw new Error(`Missing share image: ${shareImage}`);
  const tags = [
    `<link data-rh="true" rel="manifest" href="/manifest.${lang}.json" />`,
    `<meta data-rh="true" name="description" content="${escapeAttr(cleanDescription)}" />`,
    `<meta data-rh="true" property="og:title" content="${escapeAttr(ogTitle)}" />`,
    `<meta data-rh="true" property="og:description" content="${escapeAttr(cleanDescription)}" />`,
    `<meta data-rh="true" property="og:url" content="${escapeAttr(selfHref)}" />`,
    `<meta data-rh="true" property="og:type" content="${ogType}" />`,
    `<meta data-rh="true" property="og:site_name" content="${escapeAttr(SITE_NAME)}" />`,
    `<meta data-rh="true" property="og:image" content="${escapeAttr(shareImage)}" />`,
    `<meta data-rh="true" property="og:image:type" content="image/png" />`,
    `<meta data-rh="true" property="og:image:width" content="1200" />`,
    `<meta data-rh="true" property="og:image:height" content="630" />`,
    `<meta data-rh="true" property="og:image:alt" content="${escapeAttr(ogTitle)}" />`,
    `<meta data-rh="true" property="og:locale" content="${ogLocale(lang)}" />`,
    `<meta data-rh="true" name="twitter:image" content="${escapeAttr(shareImage)}" />`,
    `<meta data-rh="true" name="twitter:image:alt" content="${escapeAttr(ogTitle)}" />`,
    `<meta data-rh="true" name="twitter:card" content="summary_large_image" />`,
    `<meta data-rh="true" name="twitter:title" content="${escapeAttr(ogTitle)}" />`,
    `<meta data-rh="true" name="twitter:description" content="${escapeAttr(cleanDescription)}" />`,
    `<link data-rh="true" rel="canonical" href="${escapeAttr(selfHref)}" />`,
    ...hreflangLinks.map(
      ({ hreflang, href }) => `<link data-rh="true" rel="alternate" hreflang="${hreflang}" href="${escapeAttr(href)}" />`
    ),
    ...(articleJsonLd ? [`<script data-rh="true" type="application/ld+json">${JSON.stringify(articleJsonLd).replace(/</g, '\\u003c')}</script>`] : []),
  ];

  html = html.replace('</head>', `${tags.join('\n    ')}\n  </head>`);
  return articleMarkup ? html.replace('<div id="root"></div>', `<div id="root">${articleMarkup}</div>`) : html;
}

async function renderStaticArticle(sourceFile, title, originalSlug) {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const [{ default: ReactMarkdown }, { default: remarkGfm }] = await Promise.all([
    import('react-markdown'), import('remark-gfm'),
  ]);
  const markdown = fs.readFileSync(sourceFile, 'utf8').replace(/^---\s*\n[\s\S]*?\n---(?:\s*\n|$)/, '').trim();
  const body = renderToStaticMarkup(React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm],
    components: {
      img: ({ src, alt }) => React.createElement('img', {
        src: src?.startsWith('./') ? `/articles/${encodeURIComponent(originalSlug)}/${src.slice(2)}` : src,
        ...imageDimensions[src?.startsWith('./') ? `/articles/${originalSlug}/${src.slice(2)}` : src],
        alt,
        loading: 'lazy',
      }),
    },
  }, markdown));
  // createRoot replaces this content for interactive visitors. Text-only crawlers can read it directly.
  return `<article class="article-detail-page" data-seo-article="true"><h1>${escapeAttr(title)}</h1>${body}</article>`;
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

async function main() {
  const indexPath = path.join(BUILD_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('generate-seo-shells: build/index.html not found. Run `react-app-rewired build` first.');
    process.exit(1);
  }

  for (const locale of LANGS) {
    const manifestPath = path.join(ROOT, 'public', `manifest.${locale}.json`);
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Missing locale manifest: public/manifest.${locale}.json`);
    }
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

  // SPA-only routes (account, watchlist, checkout, admin, and unknown legacy
  // routes) share this fallback. Mark the first HTML response noindex before
  // React starts; AppContent keeps the directive in sync during client-side
  // navigation and removes it again on public indexable routes.
  const spaFallback = stripPreviousInjection(template).replace(
    '</head>',
    '<meta data-rh="true" name="robots" content="noindex, follow" />\n  </head>'
  );
  writeFile(spaPath, spaFallback);
  written.push(spaPath);

  // Per-language x per-route shells, respecting route-specific SEO availability.
  for (const { basePath, metaKey, seoLocales = LANGS } of ROUTES) {
    const xDefaultLocale = seoLocales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : seoLocales[0];
    for (const lang of seoLocales) {
      const meta = readLocaleValue(lang, metaKey);
      const ogTitle = meta.pageTitle;
      const title = buildSeoTitle(ogTitle, defaultTitle(lang));
      const description = normalizeMetaDescription(meta.pageDescription);
      const selfHref = selfUrl(lang, basePath);
      const xDefaultHref = basePath === '' ? `${SITE_ORIGIN}/` : selfUrl(xDefaultLocale, basePath);

      const hreflangLinks = [
        ...seoLocales.map((hLang) => ({ hreflang: hLang, href: selfUrl(hLang, basePath) })),
        { hreflang: 'x-default', href: xDefaultHref },
      ];

      const html = renderShell(template, { lang, title, ogTitle, description, selfHref, hreflangLinks, image: socialImagePath(basePath, lang) });
      const outPath =
        basePath === ''
          ? path.join(BUILD_DIR, lang, 'index.html')
          : path.join(BUILD_DIR, lang, ...basePath.split('/').filter(Boolean), 'index.html');

      writeFile(outPath, html);
      written.push(outPath);
    }
  }

  // Published articles include readable content and the actual translated URLs.
  for (const { lang, slug, originalSlug, sourceFile } of ARTICLES) {
    const decodedSlug = decodeURIComponent(slug);
    const meta = articleFrontmatter(sourceFile);
    const title = buildSeoTitle(meta.title, defaultTitle(lang));
    const description = normalizeMetaDescription(meta.description);
    const selfHref = `${SITE_ORIGIN}/${lang}/articles/${encodeURIComponent(decodedSlug)}/`;

    const articleImage = `${SITE_ORIGIN}${socialImagePath('', lang, originalSlug.split('.')[0])}`;
    const articleMarkup = await renderStaticArticle(sourceFile, meta.title, originalSlug);
    const articleJsonLd = {
      '@context': 'https://schema.org', '@type': 'Article', headline: meta.title,
      description, inLanguage: lang, datePublished: meta.date, dateModified: meta.updated || meta.date,
      mainEntityOfPage: selfHref, image: articleImage,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME },
    };
    const alternates = ARTICLES
      .filter(article => article.originalSlug === originalSlug)
      .map(article => ({
        hreflang: article.lang,
        href: `${SITE_ORIGIN}/${article.lang}/articles/${encodeURIComponent(article.slug)}/`,
      }));
    const html = renderShell(template, { lang, title, ogTitle: meta.title, description, selfHref,
      hreflangLinks: [...alternates, { hreflang: 'x-default', href: alternates[0].href }], articleMarkup, articleJsonLd, articleImage, ogType: 'article' });
    const outPath = path.join(BUILD_DIR, lang, 'articles', decodedSlug, 'index.html');

    writeFile(outPath, html);
    written.push(outPath);
  }

  // Bare root ("/"): gets the English home meta injected directly into
  // build/index.html itself (Netlify serves this for a literal "/" request
  // before the catch-all redirect is ever consulted).
  {
    const ogTitle = STRINGS[DEFAULT_LOCALE].home.pageTitle;
    const title = buildSeoTitle(ogTitle, defaultTitle(DEFAULT_LOCALE));
    const description = normalizeMetaDescription(STRINGS[DEFAULT_LOCALE].home.pageDescription);
    const selfHref = `${SITE_ORIGIN}/`;
    const hreflangLinks = [
      ...LANGS.map((hLang) => ({ hreflang: hLang, href: selfUrl(hLang, '') })),
      { hreflang: 'x-default', href: `${SITE_ORIGIN}/` },
    ];

    const html = renderShell(template, { lang: DEFAULT_LOCALE, title, ogTitle, description, selfHref, hreflangLinks });
    writeFile(indexPath, html);
    written.push(indexPath);
  }

  fs.copyFileSync(path.join(ROOT, 'public/404.html'), path.join(BUILD_DIR, '404.html'));

  console.log(`generate-seo-shells: wrote ${written.length} files under build/.`);

  checkSitemapCoverage();
}

// Every non-verification URL in sitemap.xml must resolve to a shell file we
// just generated. Catches route-table/sitemap drift at build time instead of
// silently shipping a stale shell set.
function checkSitemapCoverage() {
  const sitemapPath = path.join(ROOT, 'public/sitemap.xml');
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  // Example URLs inside XML comments are documentation, not indexable routes.
  const activeSitemapXml = sitemapXml.replace(/<!--[\s\S]*?-->/g, '');
  const localeSet = new Set(LANGS);
  const entries = [...activeSitemapXml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => {
    const loc = (block.match(/<loc>\s*([^<]+)\s*<\/loc>/) || [])[1];
    if (!loc) return null;
    const alternates = new Map([...block.matchAll(
      /<xhtml:link\b[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"[^>]*\/?>/g
    )].map(([, language, href]) => [language, href]));
    const pathname = new URL(loc).pathname.replace(/\/$/, '') || '/';
    return { loc, pathname, alternates };
  }).filter(Boolean);
  const entryByPath = new Map(entries.map(entry => [entry.pathname, entry]));

  const missing = [];
  const unsupportedLocaleRoutes = [];
  const missingAlternateRoutes = [];
  for (const entry of entries) {
    for (const [hreflang, href] of entry.alternates) {
      if (hreflang === 'x-default') continue;
      const alternatePath = new URL(href).pathname.replace(/\/$/, '') || '/';
      if (!entryByPath.has(alternatePath)) {
        missingAlternateRoutes.push({ source: entry.loc, hreflang, href });
      }
    }
  }
  let checkedCount = 0;
  for (const { loc } of entries) {
    const url = new URL(loc);
    const pathname = url.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0];

    // Skip non-locale entries (for example, the x-default homepage).
    if (!localeSet.has(locale)) continue;

    const routePath = `/${segments.slice(1).join('/')}`.replace(/\/$/, '');
    const routeConfig = ROUTES.find(route => route.basePath === routePath);
    if (routeConfig && !(routeConfig.seoLocales || LANGS).includes(locale)) {
      unsupportedLocaleRoutes.push({ loc, allowed: routeConfig.seoLocales || LANGS });
      continue;
    }

    checkedCount += 1;

    const decodedPathname = decodeURIComponent(pathname);
    const expectedFile = path.join(BUILD_DIR, decodedPathname, 'index.html');

    if (!fs.existsSync(expectedFile)) {
      missing.push({ loc, expectedFile });
    }
  }

  if (unsupportedLocaleRoutes.length > 0) {
    console.error(`generate-seo-shells: ${unsupportedLocaleRoutes.length} unsupported locale route(s) are present in sitemap.xml:`);
    for (const { loc, allowed } of unsupportedLocaleRoutes) {
      console.error(`  - ${loc} (allowed: ${allowed.join(', ')})`);
    }
    process.exit(1);
  }

  if (missingAlternateRoutes.length > 0) {
    console.error(`generate-seo-shells: ${missingAlternateRoutes.length} alternate URL(s) are not present in sitemap.xml:`);
    for (const { source, hreflang, href } of missingAlternateRoutes) {
      console.error(`  - ${source} [${hreflang}] points to ${href}`);
    }
    process.exit(1);
  }

  // Every enabled locale must have every public route in the sitemap. This
  // makes adding a locale an explicit SEO rollout rather than silently
  // shipping pages without discoverable, reciprocal hreflang entries.
  const missingLocaleRoutes = [];
  const missingHreflang = [];
  for (const { basePath, seoLocales = LANGS } of ROUTES) {
    const xDefaultLocale = seoLocales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : seoLocales[0];
    for (const lang of seoLocales) {
      const expectedPath = `/${lang}${basePath}`.replace(/\/$/, '') || `/${lang}`;
      const entry = entryByPath.get(expectedPath);
      if (!entry) {
        missingLocaleRoutes.push(expectedPath);
        continue;
      }

      const expectedAlternates = [
        ...seoLocales.map(locale => [locale, selfUrl(locale, basePath)]),
        ['x-default', basePath === '' ? `${SITE_ORIGIN}/` : selfUrl(xDefaultLocale, basePath)],
      ];
      for (const [hreflang, expectedHref] of expectedAlternates) {
        const actualHref = entry.alternates.get(hreflang);
        if (actualHref !== expectedHref) {
          missingHreflang.push({ path: expectedPath, hreflang, expectedHref, actualHref });
        }
      }
    }
  }

  if (missingLocaleRoutes.length > 0) {
    console.error(`generate-seo-shells: ${missingLocaleRoutes.length} locale route(s) are missing from sitemap.xml:`);
    for (const route of missingLocaleRoutes) console.error(`  - ${route}`);
    process.exit(1);
  }

  if (missingHreflang.length > 0) {
    console.error(`generate-seo-shells: ${missingHreflang.length} locale route(s) have missing or incorrect reciprocal hreflang entries:`);
    for (const { path: route, hreflang, expectedHref, actualHref } of missingHreflang) {
      console.error(`  - ${route} [${hreflang}] expected ${expectedHref}, received ${actualHref || '(missing)'}`);
    }
    process.exit(1);
  }

  if (missing.length > 0) {
    console.error(`generate-seo-shells: ${missing.length} sitemap URL(s) have no matching shell:`);
    for (const { loc, expectedFile } of missing) {
      console.error(`  - ${loc}\n    expected: ${expectedFile}`);
    }
    process.exit(1);
  }

  console.log(`generate-seo-shells: sitemap coverage check passed (${checkedCount} URLs checked; ${LANGS.length} locale(s) × ${ROUTES.length} public routes with reciprocal hreflang).`);
}

main().catch((error) => { console.error(error); process.exit(1); });
