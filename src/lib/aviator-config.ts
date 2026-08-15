/**
 * Aviator operator credentials.
 *
 * These are kept in code (not env vars) so the same values are used by the
 * launch call and the wallet endpoint on every deployment. Paste the exact
 * same slug and secret into the Aviator "Integrations" form.
 */
export const AVIATOR = {
  /** Slug (operator id) — must match the Aviator integration exactly. */
  slug: "aviator",
  /** Display name registered with the Aviator provider. */
  displayName: "betplus",
  /** API secret (HMAC key) — must match the Aviator integration exactly. */
  secret: "0958b144d45cacd3148eb19259b1d487e0c2da5aa251e51b",
  /** Where the game itself is hosted. */
  gameUrl: "https://aviator-betplus.vercel.app",
  /** Default player currency. */
  currency: "UGX",
} as const;
