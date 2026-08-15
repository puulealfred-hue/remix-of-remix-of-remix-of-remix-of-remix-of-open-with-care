import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Check, X } from "lucide-react";
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
  const { sport, leagueIds, countryIds, toggleLeague, toggleCountry, clearFilters } =
    useSportFilters();
  const leagues = useQuery(leaguesQuery(sport));

  const all = leagues.data ?? [];
  const selectedCount = leagueIds.length + countryIds.length;

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

  const activeCountries = countries.filter((c) => countryIds.includes(c.key));

  const shown: League[] = useMemo(() => {
    const list =
      countryIds.length > 0 ? all.filter((l) => countryIds.includes(l.countryKey)) : all;
    const selected = all.filter((l) => leagueIds.includes(l.key));
    const rest = [...list]
      .filter((l) => !leagueIds.includes(l.key))
      .sort(
        (a, b) =>
          leagueRank(sport, a.name, a.country) - leagueRank(sport, b.name, b.country) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, countryIds.length > 0 ? 400 : 40);
    return [...selected, ...rest];
  }, [all, countryIds, leagueIds, sport]);

  if (all.length === 0) return null;

  return (
    <div className="border-b border-xb-line px-3 py-1.5">
      <div className="mb-1 flex items-center gap-2 text-[10px] text-xb-text-muted">
        <span>Countries — pick as many as you like</span>
        {selectedCount > 0 && (
          <button
            onClick={clearFilters}
            className="ml-auto inline-flex items-center gap-1 rounded-full bg-xb-odds px-2 py-0.5 font-bold text-xb-text hover:bg-xb-odds-hover"
          >
            <X className="h-3 w-3" /> Clear {selectedCount} filter{selectedCount > 1 ? "s" : ""}
          </button>
        )}
      </div>
      <Scroller>
        <button
          onClick={clearFilters}
          className={`flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors ${
            countryIds.length === 0
              ? "bg-xb-text text-xb-panel"
              : "bg-xb-odds text-xb-text hover:bg-xb-odds-hover"
          }`}
        >
          All
        </button>
        {countries.map((c) => {
          const on = countryIds.includes(c.key);
          return (
            <button
              key={c.key}
              onClick={() => toggleCountry(c.key)}
              className={`flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors ${
                on ? "bg-xb-text text-xb-panel" : "bg-xb-odds text-xb-text hover:bg-xb-odds-hover"
              }`}
            >
              {on ? (
                <Check className="h-3 w-3" />
              ) : c.logo ? (
                <img src={c.logo} alt="" className="h-3 w-4 rounded-sm object-cover" loading="lazy" />
              ) : (
                <span className="h-3 w-4 rounded-sm bg-xb-odds-hover" />
              )}
              <span className="whitespace-nowrap">{c.name}</span>
            </button>
          );
        })}
      </Scroller>

      <div className="mb-1 mt-2 text-[10px] text-xb-text-muted">
        {activeCountries.length > 0
          ? `${activeCountries.map((c) => c.name).join(", ")} leagues`
          : "Popular leagues"}
      </div>
      <Scroller>
        {shown.map((l) => {
          const on = leagueIds.includes(l.key);
          return (
            <button
              key={l.key}
              onClick={() => toggleLeague(l.key)}
              className={`flex h-8 w-[150px] shrink-0 items-center gap-1.5 rounded-md px-2 text-left transition-colors ${
                on ? "bg-xb-blue text-xb-on-dark" : "bg-xb-odds hover:bg-xb-odds-hover"
              }`}
            >
              {on ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : l.logo ? (
                <img src={l.logo} alt="" className="h-4 w-4 shrink-0 rounded-full object-contain" loading="lazy" />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full bg-xb-odds-hover" />
              )}
              <span className="min-w-0">
                <span
                  className={`block truncate text-[11px] font-bold leading-tight ${
                    on ? "text-xb-on-dark" : "text-xb-text"
                  }`}
                >
                  {l.name}
                </span>
                <span
                  className={`block truncate text-[9px] leading-tight ${
                    on ? "text-xb-on-dark/80" : "text-xb-text-muted"
                  }`}
                >
                  {l.country || "International"}
                </span>
              </span>
            </button>
          );
        })}
      </Scroller>
    </div>
  );
}
