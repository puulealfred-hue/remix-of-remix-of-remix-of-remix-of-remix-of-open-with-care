import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useSportFilters } from "./SportFilterContext";
import { leaguesQuery, type League } from "@/lib/sports-queries";
import { countryRank, leagueRank } from "@/lib/popular";

function Scroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const nudge = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  return (
    <div className="relative">
      <div ref={ref} className="flex gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <button
        aria-label="Scroll left"
        onClick={() => nudge(-1)}
        className="absolute left-0 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-xb-odds text-xb-text-muted shadow hover:text-xb-text md:flex"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <button
        aria-label="Scroll right"
        onClick={() => nudge(1)}
        className="absolute right-0 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-xb-odds text-xb-text-muted shadow hover:text-xb-text md:flex"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function LeagueFilterBar() {
  const { sport, leagueId, countryId, setLeague } = useSportFilters();
  const leagues = useQuery(leaguesQuery(sport));

  const all = leagues.data ?? [];

  const countries = useMemo(() => {
    const map = new Map<number, { key: number; name: string; logo: string | null }>();
    for (const l of all) {
      if (!l.country) continue;
      if (!map.has(l.countryKey)) {
        map.set(l.countryKey, { key: l.countryKey, name: l.country, logo: l.countryLogo });
      }
    }
    return [...map.values()].sort(
      (a, b) => countryRank(a.name) - countryRank(b.name) || a.name.localeCompare(b.name),
    );
  }, [all]);

  const activeCountry = countries.find((c) => c.key === countryId) ?? null;

  const shown: League[] = useMemo(() => {
    const list = activeCountry ? all.filter((l) => l.countryKey === activeCountry.key) : all;
    return [...list]
      .sort(
        (a, b) =>
          leagueRank(sport, a.name, a.country) - leagueRank(sport, b.name, b.country) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, activeCountry ? 60 : 30);
  }, [all, activeCountry, sport]);

  if (all.length === 0) return null;

  return (
    <div className="border-b border-xb-line px-3 py-1.5">
      <div className="mb-1 text-[10px] text-xb-text-muted">Countries</div>
      <Scroller>
        <button
          onClick={() => setLeague(null, null)}
          className={`flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors ${
            !countryId ? "bg-xb-text text-xb-panel" : "bg-xb-odds text-xb-text hover:bg-xb-odds-hover"
          }`}
        >
          All
        </button>
        {countries.map((c) => (
          <button
            key={c.key}
            onClick={() => setLeague(null, c.key)}
            className={`flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors ${
              countryId === c.key
                ? "bg-xb-text text-xb-panel"
                : "bg-xb-odds text-xb-text hover:bg-xb-odds-hover"
            }`}
          >
            {c.logo ? (
              <img src={c.logo} alt="" className="h-3 w-4 rounded-sm object-cover" loading="lazy" />
            ) : (
              <span className="h-3 w-4 rounded-sm bg-xb-odds-hover" />
            )}
            <span className="whitespace-nowrap">{c.name}</span>
          </button>
        ))}
      </Scroller>

      <div className="mb-1 mt-2 text-[10px] text-xb-text-muted">
        {activeCountry ? `${activeCountry.name} leagues` : "Popular leagues"}
      </div>
      <Scroller>
        {shown.map((l) => (
          <button
            key={l.key}
            onClick={() => setLeague(l.key, l.countryKey || null)}
            className={`flex h-8 w-[150px] shrink-0 items-center gap-1.5 rounded-md px-2 text-left transition-colors ${
              leagueId === l.key ? "bg-xb-blue text-xb-on-dark" : "bg-xb-odds hover:bg-xb-odds-hover"
            }`}
          >
            {l.logo ? (
              <img src={l.logo} alt="" className="h-4 w-4 shrink-0 rounded-full object-contain" loading="lazy" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full bg-xb-odds-hover" />
            )}
            <span className="min-w-0">
              <span
                className={`block truncate text-[11px] font-bold leading-tight ${
                  leagueId === l.key ? "text-xb-on-dark" : "text-xb-text"
                }`}
              >
                {l.name}
              </span>
              <span
                className={`block truncate text-[9px] leading-tight ${
                  leagueId === l.key ? "text-xb-on-dark/80" : "text-xb-text-muted"
                }`}
              >
                {l.country || "International"}
              </span>
            </span>
          </button>
        ))}
      </Scroller>
    </div>
  );
}

