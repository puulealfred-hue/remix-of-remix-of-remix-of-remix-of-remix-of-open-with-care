import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { getMatches, getMatchDetails, getLeagues, getLiveCounts } from "./sports.functions";
import type { MatchScope, Sport } from "./sports-types";

export type { Sport, MatchScope } from "./sports-types";
export type Match = Awaited<ReturnType<typeof getMatches>>[number];
export type MatchDetails = Awaited<ReturnType<typeof getMatchDetails>>;
export type League = Awaited<ReturnType<typeof getLeagues>>[number];
export type Market = MatchDetails["markets"][number];

export type MatchFilters = {
  sport: Sport;
  scope: MatchScope;
  leagueId?: number | null;
  countryId?: number | null;
  leagueIds?: number[] | null;
  countryIds?: number[] | null;
};

export const matchesQuery = (f: MatchFilters) => {
  const leagueIds = [...new Set([...(f.leagueIds ?? []), ...(f.leagueId ? [f.leagueId] : [])])].sort(
    (a, b) => a - b,
  );
  const countryIds = [
    ...new Set([...(f.countryIds ?? []), ...(f.countryId ? [f.countryId] : [])]),
  ].sort((a, b) => a - b);

  return queryOptions({
    queryKey: ["matches", f.sport, f.scope, leagueIds.join(","), countryIds.join(",")],
    queryFn: () =>
      getMatches({
        data: { sport: f.sport, scope: f.scope, leagueIds, countryIds },
      }),
    staleTime: f.scope === "live" ? 10_000 : 25_000,
    // Silent background updates: keep the current list on screen while refetching
    // so odds/scores swap in place instead of flashing a skeleton.
    refetchInterval: f.scope === "live" ? 15_000 : 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    // No keepPreviousData here: when the filter changes the previous
    // (unselected) list must disappear at once and the new selection loads
    // behind a skeleton instead of lingering stale rows.
  });
};

export const leaguesQuery = (sport: Sport) =>
  queryOptions({
    queryKey: ["leagues", sport],
    queryFn: () => getLeagues({ data: { sport } }),
    staleTime: 60 * 60_000,
    placeholderData: keepPreviousData,
  });

export const liveCountsQuery = () =>
  queryOptions({
    queryKey: ["live-counts"],
    queryFn: () => getLiveCounts(),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

export const matchDetailsQuery = (sport: Sport, matchId: string) =>
  queryOptions({
    queryKey: ["match", sport, matchId],
    queryFn: () => getMatchDetails({ data: { sport, matchId } }),
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

export type EventRow = MatchDetails["goals"][number];
export type MatchLineups = NonNullable<MatchDetails["lineups"]>;
export type VideoItem = MatchDetails["videos"][number];
