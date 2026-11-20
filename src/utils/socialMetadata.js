// Shared by React and the build-time HTML generator.
const images = require('../config/socialImages.json');
const { getCanonicalLocale, stripLocalePrefix } = require('../locales/localeConfig');
const SITE_ORIGIN = (process.env.REACT_APP_SITE_ORIGIN || 'https://sentimentinsideout.com').replace(/\/$/, '');
const SITE_NAME = 'Sentiment Inside Out';
const normalizeLocale = (lang) => getCanonicalLocale(lang);

// Keep title construction identical in the React app and the static SEO
// shell generator. Several localized page titles already contain the brand,
// so append it only when it is not present rather than repeating it in every
// title through pageContainer.defaultTitle.
function buildSeoTitle(title, fallbackTitle = SITE_NAME) {
  const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim();
  const fallback = String(fallbackTitle || SITE_NAME).replace(/\s+/g, ' ').trim();
  if (!cleanTitle) return fallback || SITE_NAME;
  if (cleanTitle.toLowerCase().includes(SITE_NAME.toLowerCase())) return cleanTitle;
  return `${cleanTitle} | ${SITE_NAME}`;
}

// Do not impose an arbitrary character limit: Google truncates snippets based
// on the available display width and may use page text instead. Normalize
// whitespace only, keeping the authored description intact.
function normalizeMetaDescription(description, fallback = '') {
  const cleanDescription = String(description || '').replace(/\s+/g, ' ').trim();
  if (cleanDescription) return cleanDescription;
  return String(fallback || '').replace(/\s+/g, ' ').trim();
}

function socialImagePath(pathname, lang, articleNumber) {
  const locale = normalizeLocale(lang);
  const route = stripLocalePrefix(pathname).replace(/\/$/, '');
  const image = ['1', '2', '4', '5'].includes(String(articleNumber)) ? `article-${articleNumber}` :
    (images[route] || (route.startsWith('/sentiment-indicators/') ? 'sentiment-indicators' : 'home'));
  return `/images/social/${locale}/${image}.png`;
}

function canonicalUrl(rawUrl, origin = SITE_ORIGIN) {
  // Keep canonical URLs on the primary domain even when the app is rendered
  // on a Netlify Deploy Preview or another non-indexable host.
  const parsedUrl = new URL(rawUrl, origin);
  const url = new URL(parsedUrl.pathname, origin);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/`;
  return url.href;
}

module.exports = {
  SITE_ORIGIN,
  SITE_NAME,
  socialImagePath,
  canonicalUrl,
  normalizeLocale,
  buildSeoTitle,
  normalizeMetaDescription,
};
