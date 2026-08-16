/**
 * Late in-play lock.
 *
 * From minute 80 of a live match the current result is effectively decided, so
 * only the outcomes that back the *current* result are locked (the leading
 * team's win, or the draw when the score is level). Every other market on the
 * same match stays open, because a comeback still pays there.
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

/** Result-type markets are the only ones the late lock applies to. */
const RESULT_MARKET =
  /^(1x2|home\/?away|3way result|match winner|winner|result|to win|double chance|draw no bet)/i;

/** Sides a market outcome label backs, e.g. "1X" -> home + draw. */
function labelSides(label: string): Array<"home" | "away" | "draw"> {
  const l = label.trim().toLowerCase();
  if (/^(1x|home or draw|home\/draw)$/.test(l)) return ["home", "draw"];
  if (/^(x2|draw or away|draw\/away)$/.test(l)) return ["draw", "away"];
  if (/^(12|home or away|home\/away)$/.test(l)) return ["home", "away"];
  if (/^(1|home|host.*)$/.test(l)) return ["home"];
  if (/^(2|away|guest.*)$/.test(l)) return ["away"];
  if (/^(x|draw|tie)$/.test(l)) return ["draw"];
  return [];
}

/**
 * Locked when the match is in its closing minutes AND this outcome is the one
 * that the current score has already all but settled.
 */
export function outcomeLocked(m: LockableMatch, market: string, label: string): boolean {
  if (!isLateLive(m)) return false;
  const side = leadingSide(m);
  if (!side) return false;
  const name = market.trim();
  // Panel columns pass the outcome label as the market name ("1", "X", "2").
  const isResultMarket = RESULT_MARKET.test(name) || labelSides(name).length > 0;
  if (!isResultMarket) return false;
  return labelSides(label).includes(side);
}

/** Human explanation shown on a locked outcome. */
export function lockReason(m: LockableMatch): string {
  const side = leadingSide(m);
  const min = liveMinute(m.status);
  const who =
    side === "draw"
      ? "the draw"
      : side === "home"
        ? "the home win"
        : side === "away"
          ? "the away win"
          : "the result";
  return `Closed — ${min ?? 80}' and ${who} is already ~90-100% decided`;
}
