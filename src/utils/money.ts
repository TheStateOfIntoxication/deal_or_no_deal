const CENTS_PER_UNIT = 100

/**
 * Format integer cents for display: $1,000,000 / $0.01
 * Display format never feeds back into internal math (R-8.2, R-8.3)
 */
export function formatMoney(cents: number): string {
  const safe = Math.max(0, Math.floor(cents))
  const whole = Math.floor(safe / CENTS_PER_UNIT)
  const fraction = safe % CENTS_PER_UNIT
  return `$${whole.toLocaleString('en-US')}.${String(fraction).padStart(2, '0')}`
}

/** Format a signed amount, e.g. -$1.00 for a penalty */
export function formatSignedMoney(cents: number): string {
  const safe = Math.trunc(cents)
  return `${safe < 0 ? '−' : ''}${formatMoney(Math.abs(safe))}`
}
