import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Star, BarChart3, RefreshCw, ArrowUp, ArrowDown, Zap, Lock, ChevronRight } from "lucide-react";

import { useBetSlip } from "./BetSlipContext";
import { useSportFilters } from "./SportFilterContext";
import { MatchesListSkeleton } from "./Skeletons";
import { useOddsFlash, oddsFlashClass } from "@/lib/use-odds-flash";

import { matchesQuery, leaguesQuery, type Match } from "@/lib/sports-queries";
import { leagueRank } from "@/lib/popular";
import { LeagueFilterBar } from "./LeagueFilterBar";
import { SPORTS, SPORT_LABELS, type MatchScope } from "@/lib/sports-types";
import { ugDateKey, ugDateLabel, ugTime } from "@/lib/time";
import { useFavorites } from "@/lib/favorites";

const tabs: { key: MatchScope; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  
  { key: "boosted", label: "Boosted" },
  { key: "topbets", label: "Top Bets" },
];

function OddsScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [canNext, setCanNext] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanNext(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative -mx-2 w-[calc(100%+1rem)] md:mx-0 md:ml-auto md:w-auto">
      <div
        ref={ref}
        onScroll={update}
        className="xb-noscroll flex w-full gap-1 overflow-x-auto px-2 md:w-auto md:overflow-visible md:px-0"
      >
        {children}
      </div>
      {canNext && (
        <button
          type="button"
          aria-label="Show more odds"
          onClick={() => ref.current?.scrollBy({ left: 140, behavior: "smooth" })}
          className="absolute right-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-xb-panel-alt/90 text-xb-text shadow ring-1 ring-xb-line md:hidden"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function OddsButton({

  match,
  label,
  shortLabel,
  value,
}: {
  match: Match;
  label: string;
  shortLabel?: string;
  value: number | null;
}) {
  const { toggle, has } = useBetSlip();
  const flash = useOddsFlash(value);
  const id = `${match.id}-${label}`;
  if (!value) {
    return (
      <span
        title="Market not available"
        aria-label="Odd not available"
        className="flex w-[74px] shrink-0 flex-col items-center justify-center rounded-md bg-xb-odds py-1.5 text-xb-text-muted opacity-70 md:w-[74px] md:py-2.5"
      >
        <span className="text-[10px] font-medium md:hidden">{shortLabel ?? label}</span>
        <Lock className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <button
      onClick={() =>
        toggle({
          id,
          matchId: match.id,
          event: `${match.home} — ${match.away}`,
          market: label,
          odd: value,
          sport: match.sport,
          league: `${match.country ?? ""} ${match.league ?? ""}`.trim(),
          kickoff: match.kickoff,
        })
      }
      className={`w-[74px] shrink-0 rounded-md px-1 py-1.5 text-center transition-colors md:py-2.5 ${
        has(id) ? "bg-xb-blue text-xb-on-dark" : "bg-xb-odds text-xb-text hover:bg-xb-odds-hover"
      } ${oddsFlashClass(flash)}`}
    >
      <span
        className={`block truncate text-[10px] font-medium leading-tight md:hidden ${
          has(id) ? "text-xb-on-dark/80" : "text-xb-text-muted"
        }`}
      >
        {shortLabel ?? label}
      </span>
      <span className="inline-flex items-center gap-0.5 text-[13px] font-bold leading-tight">
        {value.toFixed(2)}
        {flash === "up" && <ArrowUp className="h-3 w-3" />}
        {flash === "down" && <ArrowDown className="h-3 w-3" />}
      </span>
    </button>
  );
}


export function MatchesPanel() {
  const { sport, setSport, scope, setScope, leagueIds, countryIds, clearFilters } =
    useSportFilters();
  const [query, setQuery] = useState("");
  const { isFavorite, toggleFavorite } = useFavorites();

  const matches = useQuery(matchesQuery({ sport, scope, leagueIds, countryIds }));
  const leagues = useQuery(leaguesQuery(sport));

  const activeLabels = useMemo(() => {
    const all = leagues.data ?? [];
    const names = leagueIds
      .map((id) => all.find((l) => l.key === id))
      .filter(Boolean)
      .map((l) => `${l!.country} · ${l!.name}`);
    const countries = countryIds
      .map((id) => all.find((l) => l.countryKey === id)?.country)
      .filter(Boolean) as string[];
    return [...names, ...[...new Set(countries)]];
  }, [leagues.data, leagueIds, countryIds]);

  const isFootball = sport === "football";
  const marketCols = isFootball
    ? ["1", "X", "2", "Over 2.5", "Under 2.5", "GG", "NG"]
    : ["1", "2"];


  const filtered = leagueIds.length > 0 || countryIds.length > 0;

  const visible = useMemo(() => {
    let list = matches.data ?? [];
    // Hide events with no odds at all (results keep showing final scores).
    // When a league/country filter is active, show the complete fixture list —
    // far-out fixtures often have no published odds yet and would vanish.
    if (scope !== "results" && !filtered) {
      list = list.filter((m) => {
        const o = m.odds ?? {};
        const values = isFootball
          ? [o.home, o.draw, o.away, o.over, o.under, o.bttsYes, o.bttsNo]
          : [o.home, o.away];
        return values.some((v) => typeof v === "number" && v > 0);
      });
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => `${m.home} ${m.away} ${m.league}`.toLowerCase().includes(q));
  }, [matches.data, query, scope, isFootball, filtered]);


  // Upcoming / Top Bets group by day; big leagues first, then start time.
  const byTime = scope === "upcoming" || scope === "topbets";

  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>();
    const rank = (m: Match) => leagueRank(m.sport, m.league ?? "", m.country ?? "");
    const sorted = byTime
      ? [...visible].sort(
          (a, b) => rank(a) - rank(b) || a.kickoff.localeCompare(b.kickoff),
        )
      : [...visible].sort((a, b) => rank(a) - rank(b));
    for (const m of sorted) {
      const key = byTime ? ugDateKey(m.date, m.time) : m.league;
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    for (const list of map.values())
      list.sort((a, b) => rank(a) - rank(b) || a.kickoff.localeCompare(b.kickoff));
    return [...map.entries()];
  }, [visible, byTime]);


  return (
    <div className="mt-2 overflow-hidden rounded-xl bg-xb-panel font-xb shadow-sm">
      <div className="xb-noscroll flex items-center gap-2 overflow-x-auto border-b border-xb-line px-3 py-2">
        {SPORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-bold transition-colors ${
              sport === s ? "bg-xb-blue text-xb-on-dark" : "text-xb-text-muted hover:text-xb-text"
            }`}
          >
            {SPORT_LABELS[s]}
          </button>
        ))}
        <div className="ml-auto hidden items-center gap-2 rounded-full border border-xb-line px-3 py-1 md:flex">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by match"
            className="w-40 bg-transparent text-[12px] text-xb-text outline-none placeholder:text-xb-text-muted"
          />
          <Search className="h-3.5 w-3.5 text-xb-blue" />
        </div>
      </div>

      <div className="xb-noscroll flex items-center gap-3 overflow-x-auto border-b border-xb-line px-3 py-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setScope(t.key)}
            className={`flex shrink-0 items-center gap-1 ${
              scope === t.key
                ? "border-b-2 border-xb-blue pb-1 text-[13px] font-bold text-xb-text"
                : "pb-1 text-[13px] text-xb-text-muted hover:text-xb-text"
            }`}
          >
            {t.key === "boosted" && <Zap className="h-3.5 w-3.5 text-xb-green" />}
            {t.label}
          </button>
        ))}
        <button
          onClick={() => matches.refetch()}
          aria-label="Refresh"
          className="flex shrink-0 items-center gap-1 text-xb-text-muted hover:text-xb-blue"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${matches.isFetching ? "animate-spin" : ""}`} />
          {matches.isFetching && <span className="text-[11px]">Updating…</span>}
        </button>
        <div className="ml-auto hidden items-center gap-2 text-[12px] md:flex">
          {activeLabels.length > 0 ? (
            <button
              onClick={clearFilters}
              className="rounded-full bg-xb-blue px-2 py-1 font-medium text-xb-on-dark"
            >
              {activeLabels.slice(0, 2).join(", ")}
              {activeLabels.length > 2 ? ` +${activeLabels.length - 2}` : ""} ✕
            </button>
          ) : (
            <span className="text-xb-text-muted">All leagues</span>
          )}
        </div>
      </div>

      <LeagueFilterBar />

      {filtered && matches.isFetching && (
        <div className="flex items-center justify-center gap-2 bg-xb-blue/10 px-3 py-3 text-[12px] font-bold text-xb-blue">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading matches for your selected filters…
        </div>
      )}



      {scope === "boosted" && (
        <div className="flex items-center gap-2 bg-xb-green/10 px-3 py-2 text-[12px] text-xb-text">
          <Zap className="h-3.5 w-3.5 text-xb-green" />
          <span>
            <span className="font-bold">Boosted</span> — today's fixtures from the top leagues our AI
            rates as the biggest games to bet on.
          </span>
        </div>
      )}

      {scope === "topbets" && (
        <div className="flex items-center gap-2 bg-xb-blue/10 px-3 py-2 text-[12px] text-xb-text">
          <Zap className="h-3.5 w-3.5 text-xb-blue" />
          <span>
            <span className="font-bold">Top Bets</span> — Elite European Leagues, European Cups
            (Champions, Europa, Conference), South America, England EFL Cup, N. America Leagues Cup,
            Club Friendlies and Tennis.
          </span>
        </div>
      )}

      {matches.isPending && <MatchesListSkeleton cols={isFootball ? 7 : 2} />}




      {matches.isError && (
        <div className="px-3 py-10 text-center text-[13px] text-xb-text-muted">
          Could not load matches right now.{" "}
          <button onClick={() => matches.refetch()} className="text-xb-blue underline">
            Retry
          </button>
        </div>
      )}

      {!matches.isPending && !matches.isError && visible.length === 0 && (
        <div className="px-3 py-10 text-center text-[13px] text-xb-text-muted">
          No {scope} {SPORT_LABELS[sport].toLowerCase()} events for the selected filters.
        </div>
      )}

      {grouped.map(([groupKey, list]) => (
        <div key={groupKey}>
          <div className="bg-xb-odds px-3 py-2">
            <div className="flex items-center gap-2">
              {!byTime && list[0]?.leagueLogo && (
                <img src={list[0].leagueLogo} alt="" className="h-4 w-4 rounded-full object-contain" />
              )}
              <span className="text-[13px] font-bold text-xb-blue">
                {byTime ? ugDateLabel(groupKey) : `${list[0]?.country}. ${groupKey}`}
              </span>

              <div
                className={`ml-auto hidden gap-1 text-center text-[12px] text-xb-text md:grid ${
                  isFootball ? "grid-cols-7" : "grid-cols-2"
                }`}
              >
                {marketCols.map((c) => (
                  <span key={c} className="w-[74px]">
                    {c}
                  </span>
                ))}
              </div>
            </div>

          </div>


          {list.map((m) => (
            <div
              key={m.id}
              className="relative flex flex-col gap-2 border-b border-xb-line px-2 py-2.5 md:px-3 transition-colors hover:bg-xb-panel-alt md:flex-row md:items-start"
            >
              <button
                aria-label="Add to favorites"
                onClick={() =>
                  toggleFavorite({
                    id: m.id,
                    sport: m.sport,
                    home: m.home,
                    away: m.away,
                    league: m.league,
                    country: m.country,
                    date: m.date,
                    time: m.time,
                  })
                }
                className="absolute right-3 top-2.5 text-xb-text-muted md:static md:pt-1"
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    isFavorite(m.id) ? "fill-xb-blue text-xb-blue" : "hover:text-xb-blue"
                  }`}
                />
              </button>

              <div className="w-full pr-6 md:w-[330px] md:pr-0">
                <Link
                  to="/match/$matchId"
                  params={{ matchId: m.id }}
                  search={{ sport: m.sport }}
                  className="block hover:underline"
                >
                  {/* Mobile: home — vs — away on a single line */}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-[12px] text-xb-text md:hidden">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {m.homeLogo && (
                        <img src={m.homeLogo} alt="" className="h-4 w-4 shrink-0 rounded-full object-contain" />
                      )}
                      <span className="truncate font-medium">{m.home}</span>
                      {m.homeScore != null && <span className="shrink-0 font-bold">{m.homeScore}</span>}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-xb-text-muted">vs</span>
                    <span className="flex min-w-0 items-center justify-end gap-1.5 text-right">
                      {m.awayScore != null && <span className="shrink-0 font-bold">{m.awayScore}</span>}
                      <span className="truncate font-medium">{m.away}</span>
                      {m.awayLogo && (
                        <img src={m.awayLogo} alt="" className="h-4 w-4 shrink-0 rounded-full object-contain" />
                      )}
                    </span>
                  </div>

                  <div className="hidden md:block">
                    <div className="flex items-center justify-between text-[13px] text-xb-text">
                      <span className="flex items-center gap-2">
                        {m.homeLogo && (
                          <img src={m.homeLogo} alt="" className="h-4 w-4 rounded-full object-contain" />
                        )}
                        {m.home}
                      </span>
                      <span className="font-bold">{m.homeScore ?? ""}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[13px] text-xb-text">
                      <span className="flex items-center gap-2">
                        {m.awayLogo && (
                          <img src={m.awayLogo} alt="" className="h-4 w-4 rounded-full object-contain" />
                        )}
                        {m.away}
                      </span>
                      <span className="font-bold">{m.awayScore ?? ""}</span>
                    </div>
                  </div>
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-xb-text-muted">
                  {m.live && (
                    <span className="rounded bg-xb-green px-1.5 py-0.5 font-bold text-xb-on-dark">
                      LIVE
                    </span>
                  )}
                  <span>
                    {ugDateLabel(ugDateKey(m.date, m.time))} {ugTime(m.date, m.time)}
                  </span>
                  {byTime && m.league && (
                    <span>
                      · {m.country ? `${m.country}. ` : ""}
                      {m.league}
                    </span>
                  )}

                  {m.round && <span>· {m.round}</span>}
                  {m.status && <span>· {m.status}</span>}
                  {m.marketCount > 0 && <span>· {m.marketCount} markets</span>}
                  <Link
                    to="/match/$matchId"
                    params={{ matchId: m.id }}
                    search={{ sport: m.sport }}
                    aria-label="Match details"
                    className="text-xb-blue"
                  >
                    <BarChart3 className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <OddsScroller>
                <OddsButton match={m} label="1" value={m.odds.home} />
                {isFootball && <OddsButton match={m} label="X" value={m.odds.draw} />}
                <OddsButton match={m} label="2" value={m.odds.away} />
                {isFootball && (
                  <>
                    <OddsButton match={m} label="Over 2.5" shortLabel="OVER 2.5" value={m.odds.over} />
                    <OddsButton match={m} label="Under 2.5" shortLabel="UNDER 2.5" value={m.odds.under} />
                    <OddsButton match={m} label="Both Teams To Score - Yes" shortLabel="GG" value={m.odds.bttsYes} />
                    <OddsButton match={m} label="Both Teams To Score - No" shortLabel="NG" value={m.odds.bttsNo} />
                  </>
                )}
              </OddsScroller>

            </div>
          ))}
        </div>
      ))}

      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-xb-text-muted">
        <span>Live data & bookmaker odds by AllSportsAPI</span>
        <span>Showing {visible.length} events</span>
      </div>
    </div>
  );
}
