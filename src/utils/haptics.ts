/**
 * Lightweight cross-platform haptic feedback helper
 * Provides native tactile vibration response on mobile browsers & Capacitor
 */
export const haptics = {
  // Light tap for button clicks / tabs (subtle 10ms click)
  light: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
    } catch {}
  },
  // Medium tap for confirmation actions (e.g. add expense, accept bill)
  medium: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(25);
      }
    } catch {}
  },
  // Success pattern for settlements, confetti & completions (celebratory pulse)
  success: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([15, 40, 25]);
      }
    } catch {}
  },
  // Warning / Dispute pattern
  warning: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([30, 40, 30]);
      }
    } catch {}
  },
};

