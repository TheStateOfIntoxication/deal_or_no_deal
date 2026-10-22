/** Format a 0..1 ratio as a percentage string, clamped to [0, 1] */
export function formatPercent(ratio: number, digits = 1): string {
  const safe = Math.min(1, Math.max(0, ratio))
  return `${(safe * 100).toFixed(digits)}%`
}

/** Format a signed delta as +x.x% / -x.x% */
export function formatSignedPercent(ratio: number, digits = 1): string {
  const sign = ratio >= 0 ? '+' : '−'
  return `${sign}${(Math.abs(ratio) * 100).toFixed(digits)}%`
}
