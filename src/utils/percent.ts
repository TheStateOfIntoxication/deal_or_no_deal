/** Format a 0..1 ratio as a percentage string, clamped to [0, 1] */
export function formatPercent(ratio: number, digits = 1): string {
  const safe = Math.min(1, Math.max(0, ratio))
  return `${(safe * 100).toFixed(digits)}%`
}
