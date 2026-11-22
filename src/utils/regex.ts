/**
 * Escapes special regular-expression characters in user search input
 * to prevent ReDoS and unintended regex operators.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
