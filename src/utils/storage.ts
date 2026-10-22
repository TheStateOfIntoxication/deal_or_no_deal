/** Read JSON from localStorage; returns null on any failure */
export function readJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** Write JSON to localStorage; silently ignores failures such as private mode */
export function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable: core gameplay must not be affected
  }
}
