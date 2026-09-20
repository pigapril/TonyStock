/**
 * 綁卡試用的 API 層。
 *
 * 與 paymentService 分開，比照後端把綁卡軌與定期定額軌分開的做法：這條軌上的改動
 * 不會落到既有付費者走的那條路上。
 */

import apiClient from '../api/apiClient';

const unwrap = (response) => {
    const body = response.data;
    if (body && body.status === 'success') return body.data;
    throw new Error((body && body.message) || '綁卡請求失敗');
};

export const fetchCardTrialEligibility = () => apiClient
    .get('/api/payment/card-trial/eligibility')
    .then(unwrap);

export const fetchCardTrialResult = (merchantTradeNo) => apiClient
    .get(`/api/payment/card-trial/status/${encodeURIComponent(merchantTradeNo)}`)
    .then(unwrap);

export const startCardTrial = ({ termsConsentedAt, termsVersion, locale, billingPeriod }) => apiClient
    .post('/api/payment/card-trial/start', { termsConsentedAt, termsVersion, locale, billingPeriod })
    .then(unwrap);

export const createBindCard = ({ merchantTradeNo, bindCardPayToken }) => apiClient
    .post('/api/payment/card-trial/create', { merchantTradeNo, bindCardPayToken })
    .then(unwrap);
