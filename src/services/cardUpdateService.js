/**
 * 綁卡訂閱換卡的 API 層。
 *
 * 只服務綁卡軌。定期定額訂戶的卡在綠界那一端，不會打到這裡。
 */

import apiClient from '../api/apiClient';

const unwrap = (response) => {
    const body = response.data;
    if (body && body.status === 'success') return body.data;
    throw new Error((body && body.message) || '換卡請求失敗');
};

// 沒有綁卡訂閱時回 null。
export const fetchPaymentMethod = () => apiClient
    .get('/api/payment/card-update/method')
    .then(unwrap);

export const startCardUpdate = ({ termsConsentedAt, termsVersion, locale, disclosedGrace }) => apiClient
    .post('/api/payment/card-update/start', { termsConsentedAt, termsVersion, locale, disclosedGrace })
    .then(unwrap);

export const createCardUpdateBind = ({ merchantTradeNo, bindCardPayToken, disclosedGrace }) => apiClient
    .post('/api/payment/card-update/create', { merchantTradeNo, bindCardPayToken, disclosedGrace })
    .then(unwrap);
