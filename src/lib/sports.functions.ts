import { createServerFn } from "@tanstack/react-start";
import type { MatchScope, Sport } from "./sports-types";

export const getMatches = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      sport?: Sport;
      scope?: MatchScope;
      leagueId?: number | null;
      countryId?: number | null;
      leagueIds?: number[] | null;
      countryIds?: number[] | null;
    }) => data ?? {},
  )
  .handler(async ({ data }) => {
    const { fetchMatches } = await import("./allsports.server");
    return fetchMatches({
      sport: data.sport ?? "football",
      scope: data.scope ?? "today",
      leagueId: data.leagueId ?? null,
      countryId: data.countryId ?? null,
      leagueIds: data.leagueIds ?? null,
      countryIds: data.countryIds ?? null,
    });
  });

export const getLeagues = createServerFn({ method: "GET" })
  .inputValidator((data: { sport?: Sport }) => data ?? {})
  .handler(async ({ data }) => {
    const { fetchLeagues } = await import("./allsports.server");
    return fetchLeagues(data.sport ?? "football");
  });

export const getLiveCounts = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchLiveCounts } = await import("./allsports.server");
  return fetchLiveCounts();
});

export const getMatchDetails = createServerFn({ method: "GET" })
  .inputValidator((data: { sport?: Sport; matchId: string }) => ({
    sport: (data.sport ?? "football") as Sport,
    matchId: String(data.matchId),
  }))
  .handler(async ({ data }) => {
    const { fetchMatchDetails } = await import("./allsports.server");
    return fetchMatchDetails(data.sport, data.matchId);
  });

export const askMatchAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: { sport?: Sport; matchId: string; question: string }) => ({
    sport: (data.sport ?? "football") as Sport,
    matchId: String(data.matchId),
    question: String(data.question).slice(0, 500),
  }))
  .handler(async ({ data }) => {
    const { answerMatchQuestion } = await import("./match-ai.server");
    return answerMatchQuestion(data.sport, data.matchId, data.question);
  });

export const generateAiBetSlip = createServerFn({ method: "POST" })
  .inputValidator((data: { sport?: Sport; legs?: number; risk?: "safe" | "balanced" | "high" }) => ({
    sport: (data.sport ?? "football") as Sport,
    legs: Math.max(2, Math.min(8, Number(data.legs ?? 3))),
    risk: (data.risk ?? "balanced") as "safe" | "balanced" | "high",
  }))
  .handler(async ({ data }) => {
    const { generateBetSlip } = await import("./betslip-ai.server");
    return generateBetSlip(data);
  });
