import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { MatchScope, Sport } from "@/lib/sports-types";

type Filters = {
  sport: Sport;
  scope: MatchScope;
  leagueId: number | null;
  countryId: number | null;
  setSport: (s: Sport) => void;
  setScope: (s: MatchScope) => void;
  setLeague: (leagueId: number | null, countryId?: number | null) => void;
};

const Ctx = createContext<Filters | null>(null);

export function SportFilterProvider({
  children,
  initialSport = "football",
  initialScope = "today",
}: {
  children: ReactNode;
  initialSport?: Sport;
  initialScope?: MatchScope;
}) {
  const [sport, setSportState] = useState<Sport>(initialSport);
  const [scope, setScope] = useState<MatchScope>(initialScope);
  const [leagueId, setLeagueId] = useState<number | null>(null);
  const [countryId, setCountryId] = useState<number | null>(null);

  const value = useMemo<Filters>(
    () => ({
      sport,
      scope,
      leagueId,
      countryId,
      setSport: (s) => {
        setSportState(s);
        setLeagueId(null);
        setCountryId(null);
      },
      setScope,
      setLeague: (l, c = null) => {
        setLeagueId(l);
        setCountryId(c);
        // Picking any filter (league or country) should reveal its full 3-month
        // fixture list with odds, not just today's games.
        if ((l || c) && scope !== "results" && scope !== "live") setScope("upcoming");
      },

    }),
    [sport, scope, leagueId, countryId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSportFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSportFilters must be used within SportFilterProvider");
  return ctx;
}
