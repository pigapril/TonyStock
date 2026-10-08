// Public pilot list. Set REACT_APP_FREE_TRIAL_ROLLOUT=all in a future build
// when the no-card trial is ready for everyone.
const PILOT_EMAILS = new Set([
  'pigapril@gmail.com',
  'huang41487@gmail.com'
]);

export function canSeeFreeTrial(userEmail) {
  if (!userEmail || typeof userEmail !== 'string') return false;
  if (process.env.REACT_APP_FREE_TRIAL_ROLLOUT === 'all') return true;
  return PILOT_EMAILS.has(userEmail.trim().toLowerCase());
}
