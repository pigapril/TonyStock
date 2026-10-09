import apiClient from '../api/apiClient';

const unwrap = (response) => {
  const body = response.data;
  if (body?.status === 'success') return body.data;
  throw new Error(body?.message || '免費試用請求失敗');
};

export const fetchFreeTrialEligibility = () => apiClient
  .get('/api/subscription/free-trial/eligibility')
  .then(unwrap);

export const startFreeTrial = () => apiClient
  .post('/api/subscription/free-trial/start')
  .then(unwrap);

export const claimFreeTrialPromotion = () => apiClient
  .post('/api/subscription/free-trial/promotion-impression')
  .then(unwrap);
