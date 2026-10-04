export const TOUR_STORAGE_KEY = 'sio.momentumDashboard.tourSeen.v1';

export function hasSeenMomentumTour() {
  try { return window.localStorage.getItem(TOUR_STORAGE_KEY) === '1'; }
  catch { return true; }
}

export function markMomentumTourSeen() {
  try { window.localStorage.setItem(TOUR_STORAGE_KEY, '1'); }
  catch { /* The tour remains dismissible when storage is unavailable. */ }
}
