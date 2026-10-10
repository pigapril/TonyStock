import { ensureDataLayer } from './deferredScripts';

// Use only order metadata; never include account data, card data or URL queries.
const seenEvents = new Set();
function sendOnce(event, transactionId, ecommerce, billingPeriod) {
  if (!transactionId) return;
  const key = `sio:subscription:${event}:${transactionId}`;
  try {
    if (seenEvents.has(key)) return;
    try { if (sessionStorage.getItem(key)) return; } catch { /* Storage can be disabled. */ }
    const dataLayer = ensureDataLayer();
    dataLayer.push({ ecommerce: null });
    dataLayer.push({
      event, ecommerce, billing_period: billingPeriod || null,
      page_path: window.location.pathname,
      page_location: window.location.origin + window.location.pathname,
      page_referrer: document.referrer ? new URL(document.referrer).origin + new URL(document.referrer).pathname : ''
    });
    seenEvents.add(key);
    try { sessionStorage.setItem(key, '1'); } catch { /* In-memory deduplication remains. */ }
  } catch { /* Tracking must never interrupt checkout; failed pushes may be retried. */ }
}

function orderMetadata(data) {
  const order = data.order || data;
  const rawAmount = data.amount ?? order.amount ?? data.tradeAmt;
  const value = rawAmount === null || rawAmount === undefined || rawAmount === '' ? NaN : Number(rawAmount);
  if (!Number.isFinite(value) || value < 0) return null;
  const plan = order.planType || data.planType || data.subscription?.planType;
  const period = order.billingPeriod || data.billingPeriod;
  if (plan !== 'pro' || !['monthly', 'yearly'].includes(period)) return null;
  // Always use the merchant order number on both return routes for GA deduplication.
  const id = order.merchantTradeNo || data.merchantTradeNo;
  return {
    id, period,
    ecommerce: {
      currency: 'TWD', value,
      items: [{ item_id: `${plan}_${period}`, item_name: 'Pro', item_variant: period, price: value, quantity: 1 }]
    }
  };
}

export function trackSubscriptionCheckout(data = {}) {
  const metadata = orderMetadata(data);
  if (!metadata) return;
  sendOnce('begin_checkout', metadata.id || data.orderId, metadata.ecommerce, metadata.period);
}

// Call only with a server response. A URL return code or a polling wrapper is not proof of payment.
export function trackSubscriptionPurchase(data = {}) {
  if (data.isSuccess !== true && data.orderStatus !== 'paid' && data.order?.status !== 'paid') return;
  const metadata = orderMetadata(data);
  if (!metadata?.id) return;
  sendOnce('purchase', metadata.id, { ...metadata.ecommerce, transaction_id: metadata.id }, metadata.period);
}
