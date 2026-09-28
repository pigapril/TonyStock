import { Analytics } from './analytics';

// Only allow product metadata. Never forward search text, user data, payment IDs or tokens.
const FIELDS = ['action', 'universe', 'metric', 'sort_order', 'group_name', 'asset_symbol',
  'result_count', 'source', 'billing_period', 'step', 'error_type', 'status', 'trial_days', 'planId', 'billingPeriod'];

export function trackProductEvent(event, data = {}) {
  try {
    const payload = Object.fromEntries(FIELDS.map((field) => [field, data[field] ?? null]));
    payload.page_path = window.location.pathname;
    // Result URLs contain transaction identifiers; do not send query strings to GA.
    payload.page_location = window.location.origin + window.location.pathname;
    payload.page_referrer = document.referrer ? new URL(document.referrer).origin + new URL(document.referrer).pathname : '';
    Analytics.track(event, payload);
  } catch { /* Tracking must never interrupt a user action. */ }
}

const seenTrialResults = new Set();
export function trackVerifiedTrialResult(bindingId, status) {
  if (!bindingId || !['success', 'failed', 'pending'].includes(status)) return;
  // This identifier is used locally for deduplication only; it is never sent to analytics.
  const key = `sio:trial-result:${bindingId}:${status}`;
  if (seenTrialResults.has(key)) return;
  try { if (sessionStorage.getItem(key)) return; } catch { /* Storage may be disabled. */ }
  seenTrialResults.add(key);
  try { sessionStorage.setItem(key, '1'); } catch { /* In-memory deduplication still applies. */ }
  trackProductEvent(status === 'success' ? 'card_trial_started' : 'card_trial_result', {
    status, trial_days: 30
  });
}
