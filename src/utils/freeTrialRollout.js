export function canSeeFreeTrial(userEmail) {
  return typeof userEmail === 'string' && userEmail.trim().length > 0;
}
