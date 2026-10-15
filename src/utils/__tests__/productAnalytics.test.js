import { Analytics } from '../analytics';
import { trackProductEvent, trackVerifiedTrialResult } from '../productAnalytics';

beforeEach(() => {
  delete window.dataLayer;
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

afterEach(() => jest.restoreAllMocks());

it('queues events before GTM is loaded', () => {
  Analytics.track('momentum_view', { source: 'test' });
  expect(window.dataLayer).toEqual([{ event: 'momentum_view', source: 'test' }]);
});

it('does not forward search text, identifiers, tokens or URL parameters', () => {
  trackProductEvent('card_trial_step', {
    step: 'binding', billing_period: 'monthly', email: 'private@example.test',
    merchantTradeNo: 'PRIVATE', token: 'PRIVATE', search_term: 'PRIVATE'
  });
  const event = window.dataLayer[0];
  expect(event).toMatchObject({ event: 'card_trial_step', step: 'binding', billing_period: 'monthly' });
  expect(JSON.stringify(event)).not.toMatch(/PRIVATE|private@example|merchantTradeNo|search_term/);
  expect(event.page_location).not.toMatch(/[?#]/);
});

it('counts pending separately and counts confirmed success only once per binding in a tab', () => {
  trackVerifiedTrialResult('verified-1', 'pending');
  trackVerifiedTrialResult('verified-1', 'pending');
  trackVerifiedTrialResult('verified-1', 'success');
  trackVerifiedTrialResult('verified-1', 'success');
  expect(window.dataLayer.map(event => event.event)).toEqual(['card_trial_result', 'card_trial_started']);
  expect(JSON.stringify(window.dataLayer)).not.toContain('verified-1');
});

it('honors deduplication saved before a reload', () => {
  sessionStorage.setItem('sio:trial-result:reloaded:success', '1');
  trackVerifiedTrialResult('reloaded', 'success');
  expect(window.dataLayer).toBeUndefined();
});

it('does not count failed or unidentified results as trial starts', () => {
  trackVerifiedTrialResult('failed-1', 'failed');
  trackVerifiedTrialResult(null, 'success');
  expect(window.dataLayer.map(event => event.event)).toEqual(['card_trial_result']);
});

it('cannot interrupt a product or payment operation if the tracking sink throws', () => {
  window.dataLayer = { push: () => { throw new Error('blocked'); } };
  expect(() => Analytics.track('card_trial_entry_clicked')).not.toThrow();
  expect(() => trackProductEvent('card_trial_step', { step: 'starting' })).not.toThrow();
});

it('retries a confirmed trial result after a failed queue push', () => {
  window.dataLayer = { push: () => { throw new Error('blocked'); } };
  trackVerifiedTrialResult('retry-trial', 'success');
  expect(sessionStorage.getItem('sio:trial-result:retry-trial:success')).toBeNull();

  window.dataLayer = [];
  trackVerifiedTrialResult('retry-trial', 'success');
  trackVerifiedTrialResult('retry-trial', 'success');
  expect(window.dataLayer).toHaveLength(1);
  expect(window.dataLayer[0].event).toBe('card_trial_started');
});

it.each([
  ['/en/price-analysis', 'en'],
  ['/zh-TW', 'zh-TW'],
  ['/en-US/price-analysis', null],
  ['/ko/price-analysis', null],
  ['/price-analysis', null]
])('derives site_locale from %s without forwarding query strings', (pathname, locale) => {
  window.history.replaceState({}, '', `${pathname}?token=PRIVATE#PRIVATE`);
  jest.spyOn(document, 'referrer', 'get').mockReturnValue('https://example.test/en?token=PRIVATE#PRIVATE');
  trackProductEvent('price_analysis_completed', { source: 'price_analysis', site_locale: 'untrusted' });
  expect(window.dataLayer[0]).toMatchObject({
    site_locale: locale,
    page_path: pathname,
    page_referrer: 'https://example.test/en'
  });
  expect(JSON.stringify(window.dataLayer)).not.toMatch(/PRIVATE|untrusted/);
});

it('does not lose an event when the referrer cannot be parsed', () => {
  jest.spyOn(document, 'referrer', 'get').mockReturnValue('invalid-referrer');
  expect(trackProductEvent('free_trial_analysis_clicked', { source: 'free_trial_success' })).toBe(true);
  expect(window.dataLayer[0].page_referrer).toBe('');
});
