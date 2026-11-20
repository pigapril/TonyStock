import { DEFAULT_LOCALE, LOCALE_CODES, getCanonicalLocale } from '../locales/localeConfig';

const localePattern = LOCALE_CODES.map(locale => locale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const priceAnalysisPath = new RegExp(`^/(${localePattern})/priceanalysis(?:\\?|$)`);
const exactPriceAnalysisPath = new RegExp(`^/(${localePattern})/priceanalysis$`);

const localeFor = (language) => getCanonicalLocale(language) || DEFAULT_LOCALE;

// Carry only analysis inputs through the trial flow, never arbitrary redirect URLs.
export function buildAnalysisReturnPath(language, { stockCode, years, backTestDate } = {}) {
  const query = new URLSearchParams();
  const symbol = String(stockCode || '').trim().toUpperCase();
  if (/^[A-Z0-9^][A-Z0-9.^=_-]{0,31}$/.test(symbol)) query.set('stockCode', symbol);
  if (years && Number.isFinite(Number(years)) && Number(years) > 0) query.set('years', String(Number(years)));
  if (/^\d{4}-\d{2}-\d{2}$/.test(backTestDate || '')) {
    const date = new Date(`${backTestDate}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === backTestDate) query.set('backTestDate', backTestDate);
  }
  const search = query.toString();
  return `/${localeFor(language)}/priceanalysis${search ? `?${search}` : ''}`;
}

export function getAnalysisReturnPath(search, language) {
  const candidate = new URLSearchParams(search).get('returnTo');
  if (!candidate || candidate.length > 2048 || !priceAnalysisPath.test(candidate)) return null;
  const url = new URL(candidate, 'https://local.invalid');
  if (!exactPriceAnalysisPath.test(url.pathname) || url.hash) return null;
  return buildAnalysisReturnPath(language, Object.fromEntries(url.searchParams));
}

export function withAnalysisReturnPath(destination, returnPath) {
  if (!returnPath) return destination;
  const query = new URLSearchParams({ returnTo: returnPath });
  return `${destination}?${query}`;
}
