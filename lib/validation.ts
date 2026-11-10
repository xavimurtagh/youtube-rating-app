/**
 * Parse and validate a rating score.
 *
 * The UI offers whole numbers 1–10 and the `Rating.score` column is an `Int`,
 * so we coerce to a rounded integer and reject anything outside that range
 * (including NaN, strings, booleans, etc.).
 *
 * @returns an integer in [1, 10], or null if invalid.
 */
export function parseScore(input: unknown): number | null {
  if (input === null || input === undefined || input === '' || typeof input === 'boolean') {
    return null
  }
  const n = Math.round(Number(input))
  if (!Number.isFinite(n) || n < 1 || n > 10) return null
  return n
}
