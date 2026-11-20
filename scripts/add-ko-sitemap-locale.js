#!/usr/bin/env node
// Add Korean alternates only for already-published, fully translated page
// routes. Article detail URLs are rebuilt from the complete localized article
// catalog so every emitted edition has real source content and a real slug.
// This script is idempotent.
'use strict';

const fs = require('fs');
const path = require('path');
const ARTICLE_CATALOG = require('../src/config/articleCatalog');

const ROOT = path.resolve(__dirname, '..');
const SITEMAP = path.join(ROOT, 'public/sitemap.xml');
const BUILD_SITEMAP = path.join(ROOT, 'build/sitemap.xml');
const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://sentimentinsideout.com').replace(/\/$/, '');
const KO = 'ko-KR';

function alternatesOf(body) {
  const result = new Map();
  for (const match of body.matchAll(/<xhtml:link\b[^>]*\bhreflang="([^"]+)"[^>]*\bhref="([^"]+)"[^>]*\/?>/g)) {
    result.set(match[1], match[2]);
  }
  return result;
}

function renderUrl(record, alternateLinks) {
  const metadata = record.body.replace(/\s*<xhtml:link\b[\s\S]*?\/\s*>/g, '').trim();
  return `  <url>\n    ${metadata.replace(/\n/g, '\n    ')}\n${alternateLinks.map(({ lang, href }) => (
    `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`
  )).join('\n')}\n  </url>`;
}

function localeOf(pathname) {
  const first = pathname.split('/').filter(Boolean)[0] || '';
  return ['en', 'zh-TW', 'zh-CN', KO].includes(first) ? first : null;
}

function basePathOf(pathname, locale) {
  const rest = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '');
  const normalized = rest.replace(/\/+$/, '');
  return normalized || '/';
}

function main() {
  const source = fs.readFileSync(SITEMAP, 'utf8');
  const rootOpen = source.match(/<urlset\b[^>]*>/)?.[0];
  if (!rootOpen) throw new Error('sitemap.xml has no urlset root');

  // Rebuild Korean page entries from the canonical en/zh-TW routes on every run.
  // Article detail URLs are rebuilt separately from ARTICLE_CATALOG below.
  const parsedRecords = [...source.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match, index) => {
    const body = match[1];
    const loc = body.match(/<loc>\s*([^<]+)\s*<\/loc>/)?.[1]?.trim();
    if (!loc) throw new Error(`Sitemap URL record ${index + 1} has no loc`);
    const url = new URL(loc);
    const locale = localeOf(url.pathname);
    return { body, loc, url, locale, basePath: locale ? basePathOf(url.pathname, locale) : null };
  });

  // Article detail URLs are generated from the same catalog as the frontend
  // and static SEO shells. Rebuild all their locale alternates after checking
  // that every advertised Markdown source exists.
  const articleDetailPattern = /^\/(?:en|zh-TW|zh-CN|ko-KR)\/articles\/[^/]+\/?$/;
  const records = parsedRecords.filter(record => (
    record.locale !== KO
    && !articleDetailPattern.test(record.url.pathname)
    // Watchlists are authenticated, user-specific pages and should never be
    // promoted as public sitemap entries or translated SEO alternates.
    && record.basePath !== '/watchlist'
    // The sponsor page is Taiwan-only. Remove stale English/other-locale
    // records rather than merely declining to generate a Korean alternate.
    && !(record.basePath === '/sponsor-us' && record.locale !== 'zh-TW')
  ));

  const groups = new Map();
  for (const record of records) {
    if (!record.locale) continue;
    const group = groups.get(record.basePath) || new Map();
    if (group.has(record.locale)) {
      throw new Error(`Duplicate sitemap locale route: ${record.locale}${record.basePath}`);
    }
    group.set(record.locale, record);
    groups.set(record.basePath, group);
  }

  const eligible = new Set();
  for (const [basePath, group] of groups) {
    // The Taiwan-only sponsor page remains excluded. Require both English
    // and Traditional Chinese route records before exposing Korean.
    if (basePath === '/sponsor-us') continue;
    if (!group.has('en') || !group.has('zh-TW')) continue;
    eligible.add(basePath);
    if (!group.has(KO)) {
      const english = group.get('en');
      const cleanPath = basePath === '/' ? '' : basePath;
      const koUrl = `${SITE_ORIGIN}/${KO}${cleanPath}/`;
      const body = english.body.replace(
        /<loc>\s*[^<]+\s*<\/loc>/,
        `<loc>${koUrl}</loc>`
      );
      const record = {
        body,
        loc: koUrl,
        url: new URL(koUrl),
        locale: KO,
        basePath,
      };
      group.set(KO, record);
      records.push(record);
    }
  }

  const rendered = records.map(record => {
    const group = record.basePath ? groups.get(record.basePath) : null;
    if (record.basePath === '/sponsor-us') {
      return renderUrl(record, [
        { lang: 'zh-TW', href: record.loc },
        { lang: 'x-default', href: record.loc }
      ]);
    }
    if (!group || !eligible.has(record.basePath)) {
      const currentAlternates = [...alternatesOf(record.body)]
        .filter(([lang]) => lang !== KO)
        .map(([lang, href]) => ({ lang, href }));
      return renderUrl(record, currentAlternates);
    }

    const links = [...group.entries()].map(([lang, item]) => ({ lang, href: item.loc }));
    const existingXDefault = [...groups.get(record.basePath).values()]
      .map(item => alternatesOf(item.body).get('x-default'))
      .find(Boolean);
    links.push({ lang: 'x-default', href: existingXDefault || group.get('en').loc });
    return renderUrl(record, links);
  });

  const articleRendered = ARTICLE_CATALOG.map(article => {
    const editions = Object.entries(article.locales);
    const english = article.locales.en;
    const englishPath = `/${'en'}/articles/${encodeURIComponent(english.slug)}/`;
    const existingEnglish = parsedRecords.find(record => record.url.pathname === englishPath);
    if (!existingEnglish) throw new Error(`Missing source sitemap URL for English article ${article.id}: ${englishPath}`);

    for (const [locale, edition] of editions) {
      const sourceFile = path.join(ROOT, 'public/articles', article.originalSlug, edition.filename);
      if (!fs.existsSync(sourceFile)) {
        throw new Error(`Cannot advertise incomplete ${locale} article ${article.id}; missing ${sourceFile}`);
      }
    }

    const links = editions.map(([lang, edition]) => ({
      lang,
      href: `${SITE_ORIGIN}/${lang}/articles/${encodeURIComponent(edition.slug)}/`,
    }));
    links.push({ lang: 'x-default', href: links.find(link => link.lang === 'en').href });
    const metadata = ['lastmod', 'changefreq', 'priority']
      .map(tag => existingEnglish.body.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`))?.[0])
      .filter(Boolean);

    return editions.map(([lang, edition]) => {
      const loc = `${SITE_ORIGIN}/${lang}/articles/${encodeURIComponent(edition.slug)}/`;
      return `  <url>\n    <loc>${loc}</loc>\n${metadata.map(value => `    ${value}`).join('\n')}\n${links.map(({ lang: alternateLang, href }) => (
        `    <xhtml:link rel="alternate" hreflang="${alternateLang}" href="${href}"/>`
      )).join('\n')}\n  </url>`;
    });
  }).flat();

  const output = `${rootOpen}\n\n${[...rendered, ...articleRendered].join('\n\n')}\n\n</urlset>\n`;
  const count = (output.match(/<url>/g) || []).length;
  const koPaths = [...output.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)]
    .map(match => new URL(match[1]).pathname)
    .filter(pathname => pathname.startsWith(`/${KO}/`));
  if (new Set(koPaths).size !== koPaths.length) throw new Error('Duplicate Korean sitemap URL detected');

  const articleUrls = [...output.matchAll(/<loc>(https?:\/\/[^<]+\/articles\/[^/<>]+\/?)<\/loc>/g)];
  const expectedArticleUrls = ARTICLE_CATALOG.reduce((sum, article) => sum + Object.keys(article.locales).length, 0);
  if (articleUrls.length !== expectedArticleUrls) {
    throw new Error(`Expected ${expectedArticleUrls} localized article URLs; found ${articleUrls.length}`);
  }

  fs.writeFileSync(SITEMAP, output, 'utf8');
  // CRA copies public assets before the postbuild hook. Keep the deployable
  // build copy in sync when this script runs after that copy step.
  if (fs.existsSync(path.dirname(BUILD_SITEMAP))) {
    fs.writeFileSync(BUILD_SITEMAP, output, 'utf8');
  }
  console.log(`Sitemap locale augmentation complete: ${count} URL records; ${koPaths.length} Korean routes; ${articleRendered.length} localized article routes.`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
