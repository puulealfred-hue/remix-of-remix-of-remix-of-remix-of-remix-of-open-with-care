/**
 * Late in-play lock.
 *
 * From minute 80 of a live football match onwards the outcome is effectively
 * decided (a leading or level side wins/draws ~90-100% of the time), so every
 * market on that event is locked and no new selection can be added.
 */

export type LockableMatch = {
  live?: boolean;
  finished?: boolean;
  status?: string;
  sport?: string;
  homeScore?: string | null;
  awayScore?: string | null;
};

/** Elapsed minute parsed from provider status text ("82", "45+2", "HT"). */
export function liveMinute(status: string | undefined | null): number | null {
  const s = String(status ?? "").trim();
  if (!s) return null;
  if (/^ht$|half\s*time/i.test(s)) return 45;
  if (/^ft$|finished/i.test(s)) return 90;
  const m = /^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?/.exec(s);
  if (!m) return null;
  return Number(m[1]) + Number(m[2] ?? 0);
}

/** The side the late lock protects: "home" | "away" | "draw" | null. */
export function leadingSide(m: LockableMatch): "home" | "away" | "draw" | null {
  const h = Number(m.homeScore);
  const a = Number(m.awayScore);
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
  if (h === a) return "draw";
  return h > a ? "home" : "away";
}

/** True once a live match has reached the 80th minute (through full time). */
export function isLateLive(m: LockableMatch): boolean {
  if (!m.live || m.finished) return false;
  const min = liveMinute(m.status);
  return min !== null && min >= 80;
}

/** Every market on a match in its closing minutes is locked. */
export function marketsLocked(m: LockableMatch): boolean {
  return isLateLive(m);
}

/** Human explanation shown on the locked odds buttons. */
export function lockReason(m: LockableMatch): string {
  const side = leadingSide(m);
  const min = liveMinute(m.status);
  const who =
    side === "draw" ? "the draw" : side === "home" ? "the home win" : side === "away" ? "the away win" : "the result";
  return `Betting closed — ${min ?? 80}' and ${who} is already ~90-100% decided`;
}
