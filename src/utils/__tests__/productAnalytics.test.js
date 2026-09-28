import { Analytics } from '../analytics';
import { trackProductEvent, trackVerifiedTrialResult } from '../productAnalytics';

beforeEach(() => {
  delete window.dataLayer;
  sessionStorage.clear();
});

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
