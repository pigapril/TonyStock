#!/usr/bin/env node
// Generate reciprocal sitemap alternates for every enabled, published locale.
// The historical filename is retained because it is wired into the build and
// existing regression tests; the implementation is intentionally locale-generic.
'use strict';

const fs = require('fs');
const path = require('path');
const ARTICLE_CATALOG = require('../src/config/articleCatalog');
const { LOCALE_CODES } = require('../src/locales/localeConfig');

const ROOT = path.resolve(__dirname, '..');
const SITEMAP = path.join(ROOT, 'public/sitemap.xml');
const BUILD_SITEMAP = path.join(ROOT, 'build/sitemap.xml');
const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://sentimentinsideout.com').replace(/\/$/, '');
const LOCALE_PATTERN = LOCALE_CODES.join('|');

function alternatesOf(body) {
  const result = new Map();
  for (const match of body.matchAll(/<xhtml:link\b[^>]*\bhreflang="([^"]+)"[^>]*\bhref="([^"]+)"[^>]*\/?>/g)) {
    result.set(match[1], match[2]);
  }
  return result;
}

function renderUrl(record, alternateLinks) {
  const metadata = record.body.replace(/\s*<xhtml:link\b[\s\S]*?\/\s*>/g, '').trim();
  const metadataLines = metadata.split(/\r?\n/);
  const indentedMetadata = metadataLines.map((line, index) => (
    index === 0 ? '    ' + line.trimStart() : line
  )).join('\n');
  return '  <url>\n' + indentedMetadata + '\n' + alternateLinks.map(({ lang, href }) => (
    '    <xhtml:link rel="alternate" hreflang="' + lang + '" href="' + href + '"/>'
  )).join('\n') + '\n  </url>';
}

function localeOf(pathname) {
  const first = pathname.split('/').filter(Boolean)[0] || '';
  return LOCALE_CODES.includes(first) ? first : null;
}

function basePathOf(pathname, locale) {
  const rest = pathname.replace(new RegExp('^/' + locale + '(?=/|$)'), '');
  const normalized = rest.replace(/\/+$/, '');
  return normalized || '/';
}

function localizedUrl(locale, basePath) {
  const cleanPath = basePath === '/' ? '' : basePath;
  return SITE_ORIGIN + '/' + locale + cleanPath + '/';
}

function makeLocaleRecord(template, locale, basePath) {
  const loc = localizedUrl(locale, basePath);
  const body = template.body.replace(/<loc>\s*[^<]+\s*<\/loc>/, '<loc>' + loc + '</loc>');
  return {
    body,
    loc,
    url: new URL(loc),
    locale,
    basePath,
  };
}

function main() {
  const source = fs.readFileSync(SITEMAP, 'utf8');
  const rootOpen = source.match(/<urlset\b[^>]*>/)?.[0];
  if (!rootOpen) throw new Error('sitemap.xml has no urlset root');

  const articleDetailPattern = new RegExp('^/(?:' + LOCALE_PATTERN + ')/articles/[^/]+/?$');
  const parsedRecords = [...source.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match, index) => {
    const body = match[1];
    const loc = body.match(/<loc>\s*([^<]+)\s*<\/loc>/)?.[1]?.trim();
    if (!loc) throw new Error('Sitemap URL record ' + (index + 1) + ' has no loc');
    const url = new URL(loc);
    const locale = localeOf(url.pathname);
    return { body, loc, url, locale, basePath: locale ? basePathOf(url.pathname, locale) : null };
  });

  // Rebuild all localized page alternates from the canonical en/zh-TW source
  // records. User-specific Watchlist routes stay out of the public sitemap.
  const pageRecords = parsedRecords.filter(record => (
    !articleDetailPattern.test(record.url.pathname)
    && record.basePath !== '/watchlist'
    && !(record.basePath === '/sponsor-us' && record.locale !== 'zh-TW')
  ));

  const groups = new Map();
  const nonLocalized = [];
  for (const record of pageRecords) {
    if (!record.locale) {
      nonLocalized.push(record);
      continue;
    }
    const group = groups.get(record.basePath) || new Map();
    if (group.has(record.locale)) throw new Error('Duplicate sitemap locale route: ' + record.locale + record.basePath);
    group.set(record.locale, record);
    groups.set(record.basePath, group);
  }

  const rendered = [];
  for (const [basePath, group] of groups) {
    if (basePath === '/sponsor-us') {
      const sponsor = group.get('zh-TW');
      if (sponsor) rendered.push(renderUrl(sponsor, [
        { lang: 'zh-TW', href: sponsor.loc },
        { lang: 'x-default', href: sponsor.loc },
      ]));
      continue;
    }

    const english = group.get('en');
    const traditional = group.get('zh-TW');
    if (!english || !traditional) {
      for (const record of group.values()) {
        const alternates = [...alternatesOf(record.body)].map(([lang, href]) => ({ lang, href }));
        rendered.push(renderUrl(record, alternates));
      }
      continue;
    }

    for (const locale of LOCALE_CODES) {
      if (!group.has(locale)) group.set(locale, makeLocaleRecord(english, locale, basePath));
    }
    const existingXDefault = [...group.values()]
      .map(record => alternatesOf(record.body).get('x-default'))
      .find(Boolean);
    const links = LOCALE_CODES.map(locale => ({ lang: locale, href: group.get(locale).loc }));
    links.push({ lang: 'x-default', href: existingXDefault || english.loc });
    for (const locale of LOCALE_CODES) rendered.push(renderUrl(group.get(locale), links));
  }

  for (const record of nonLocalized) {
    const alternates = [...alternatesOf(record.body)].map(([lang, href]) => ({ lang, href }));
    rendered.push(renderUrl(record, alternates));
  }

  const articleRendered = ARTICLE_CATALOG.map(article => {
    const editions = Object.entries(article.locales);
    if (!editions.some(([locale]) => locale === 'en') || !editions.some(([locale]) => locale === 'zh-TW')) {
      throw new Error('Article ' + article.id + ' requires English and zh-TW source editions');
    }
    for (const [locale, edition] of editions) {
      const sourceFile = path.join(ROOT, 'public/articles', article.originalSlug, edition.filename);
      if (!fs.existsSync(sourceFile)) throw new Error('Cannot advertise incomplete ' + locale + ' article ' + article.id + '; missing ' + sourceFile);
    }

    const english = article.locales.en;
    const englishPath = '/' + 'en' + '/articles/' + encodeURIComponent(english.slug) + '/';
    const existingEnglish = parsedRecords.find(record => record.url.pathname === englishPath);
    if (!existingEnglish) throw new Error('Missing source sitemap URL for English article ' + article.id + ': ' + englishPath);
    const metadata = ['lastmod', 'changefreq', 'priority']
      .map(tag => existingEnglish.body.match(new RegExp('<' + tag + '>[\\s\\S]*?<\\/' + tag + '>'))?.[0])
      .filter(Boolean);
    const links = editions.map(([lang, edition]) => ({
      lang,
      href: SITE_ORIGIN + '/' + lang + '/articles/' + encodeURIComponent(edition.slug) + '/',
    }));
    links.push({ lang: 'x-default', href: links.find(link => link.lang === 'en').href });

    return editions.map(([lang, edition]) => {
      const loc = SITE_ORIGIN + '/' + lang + '/articles/' + encodeURIComponent(edition.slug) + '/';
      return '  <url>\n    <loc>' + loc + '</loc>\n' +
        metadata.map(value => '    ' + value).join('\n') + '\n' +
        links.map(({ lang: alternateLang, href }) => (
          '    <xhtml:link rel="alternate" hreflang="' + alternateLang + '" href="' + href + '"/>'
        )).join('\n') + '\n  </url>';
    });
  }).flat();

  const output = rootOpen + '\n\n' + [...rendered, ...articleRendered].join('\n\n') + '\n\n</urlset>\n';
  const urls = [...output.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map(match => match[1]);
  if (new Set(urls).size !== urls.length) throw new Error('Duplicate sitemap URL detected');
  const expectedArticleUrls = ARTICLE_CATALOG.reduce((sum, article) => sum + Object.keys(article.locales).length, 0);
  const articleUrls = urls.filter(url => new RegExp('^/(?:' + LOCALE_PATTERN + ')/articles/[^/]+/?$').test(new URL(url).pathname));
  if (articleUrls.length !== expectedArticleUrls) {
    throw new Error('Expected ' + expectedArticleUrls + ' localized article URLs; found ' + articleUrls.length);
  }

  // Every advertised locale alternate must resolve to a canonical sitemap URL.
  const urlSet = new Set(urls);
  for (const match of output.matchAll(/<xhtml:link\b[^>]*\bhreflang="([^"]+)"[^>]*\bhref="([^"]+)"/g)) {
    // The site's x-default homepage intentionally points to the unprefixed
    // root URL, which is not itself listed as an indexable locale page.
    if (match[1] === 'x-default' && match[2] === SITE_ORIGIN + '/') continue;
    if (!urlSet.has(match[2])) throw new Error('Sitemap alternate does not resolve to a canonical URL: ' + match[2]);
  }

  fs.writeFileSync(SITEMAP, output, 'utf8');
  if (fs.existsSync(path.dirname(BUILD_SITEMAP))) fs.writeFileSync(BUILD_SITEMAP, output, 'utf8');
  console.log('Sitemap locale generation complete: ' + urls.length + ' URL records; ' +
    LOCALE_CODES.length + ' locales; ' + articleUrls.length + ' localized article routes.');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
