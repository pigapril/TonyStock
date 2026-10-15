// Page language is distinct from the browser language reported by GA4.
// Never include payment return parameters, fragments or referrer credentials.
export function getAnalyticsPageContext() {
  const pagePath = window.location.pathname;
  const firstSegment = pagePath.split('/')[1];
  let pageReferrer = '';
  try {
    if (document.referrer) {
      const referrer = new URL(document.referrer);
      pageReferrer = referrer.origin + referrer.pathname;
    }
  } catch { /* A missing or malformed referrer must not drop a product event. */ }

  return {
    page_path: pagePath,
    page_location: window.location.origin + pagePath,
    page_referrer: pageReferrer,
    site_locale: ['en', 'zh-TW'].includes(firstSegment) ? firstSegment : null
  };
}
