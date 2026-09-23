/**
 * Temporary frontend rollout for the bound-card trial.
 * Only an explicit "all" opens the trial to everyone. The requested pilot
 * addresses are bundled in public JavaScript.
 */
const PILOT_EMAILS = new Set([
  'pigapril@gmail.com',
  'huang41487@gmail.com'
]);

export function canSeeCardTrial(userEmail) {
  if (!userEmail || typeof userEmail !== 'string') return false;

  if (process.env.REACT_APP_CARD_TRIAL_ROLLOUT === 'all') return true;

  return PILOT_EMAILS.has(userEmail.trim().toLowerCase());
}
