import { Analytics } from './analytics';
import { getAnalyticsPageContext } from './analyticsPageContext';

// Only allow product metadata. Never forward search text, user data, payment IDs or tokens.
const FIELDS = ['action', 'universe', 'metric', 'sort_order', 'group_name', 'asset_symbol',
  'result_count', 'source', 'billing_period', 'step', 'error_type', 'status', 'trial_days', 'planId', 'billingPeriod',
  'placement', 'trigger_source'];

export function trackProductEvent(event, data = {}) {
  try {
    const payload = Object.fromEntries(FIELDS.map((field) => [field, data[field] ?? null]));
    return Analytics.track(event, { ...payload, ...getAnalyticsPageContext() });
  } catch { return false; /* Tracking must never interrupt a user action. */ }
}

const seenTrialResults = new Set();
export function trackVerifiedTrialResult(bindingId, status) {
  if (!bindingId || !['success', 'failed', 'pending'].includes(status)) return;
  // This identifier is used locally for deduplication only; it is never sent to analytics.
  const key = `sio:trial-result:${bindingId}:${status}`;
  if (seenTrialResults.has(key)) return;
  try { if (sessionStorage.getItem(key)) return; } catch { /* Storage may be disabled. */ }
  const queued = trackProductEvent(status === 'success' ? 'card_trial_started' : 'card_trial_result', {
    status, trial_days: 30
  });
  if (!queued) return;
  // Mark only after the event enters the queue, so a failed push can be retried.
  seenTrialResults.add(key);
  try { sessionStorage.setItem(key, '1'); } catch { /* In-memory deduplication still applies. */ }
}
