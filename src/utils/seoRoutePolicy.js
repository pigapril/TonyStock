const NON_INDEXABLE_EXACT_ROUTES = new Set([
  '/watchlist',
  '/user-account',
  '/subscription-plans',
  '/sponsor-success',
  '/NK-Admin',
  '/NK-Admin-diagnostic',
]);

const NON_INDEXABLE_PREFIXES = [
  '/payment',
  '/google-trends',
];

export function isNonIndexableRoute(pathname, locale) {
  const localePrefix = locale ? `/${locale}` : '';
  const localizedPath = localePrefix && pathname.startsWith(`${localePrefix}/`)
    ? pathname.slice(localePrefix.length)
    : pathname;
  const route = (localizedPath || '/').replace(/\/+$/, '') || '/';

  if (NON_INDEXABLE_EXACT_ROUTES.has(route)) return true;
  return NON_INDEXABLE_PREFIXES.some(prefix => route === prefix || route.startsWith(`${prefix}/`));
}

export default isNonIndexableRoute;
