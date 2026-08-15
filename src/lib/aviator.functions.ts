import { createServerFn } from "@tanstack/react-start";
import { AVIATOR } from "./aviator-config";

/**
 * Creates a short-lived Aviator launch session for a signed-in player.
 * Server-to-server, HMAC signed with the operator secret.
 */
export const createAviatorLaunch = createServerFn({ method: "POST" })
  .inputValidator((input: { playerId: string; playerName: string; currency?: string }) => {
    if (!input?.playerId) throw new Error("playerId required");
    return {
      playerId: String(input.playerId).slice(0, 120),
      playerName: String(input.playerName ?? "player").slice(0, 60),
      currency: (input.currency ?? "UGX").slice(0, 8),
    };
  })
  .handler(async ({ data }) => {
    const gameUrl = (process.env["AVIATOR_GAME_URL"] ?? AVIATOR.gameUrl).replace(/\/$/, "");
    const operator = process.env["AVIATOR_OPERATOR_SLUG"] || AVIATOR.slug;
    const secret = process.env["AVIATOR_API_SECRET"] || AVIATOR.secret;

    const body = JSON.stringify({
      operator_name: AVIATOR.displayName,
      player_id: data.playerId,
      player_name: data.playerName,
      currency: data.currency,
      ttl_seconds: 300,
    });

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const signature = [...new Uint8Array(sigBytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

    try {
      const res = await fetch(`${gameUrl}/api/public/operator/launch`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-operator": operator,
          "x-signature": signature,
        },
        body,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        let reason = "";
        try {
          reason = (JSON.parse(detail) as { error?: string; message?: string }).error ?? "";
        } catch {
          reason = detail.slice(0, 120);
        }
        const hint =
          res.status === 401
            ? ` Check that the operator slug "${operator}" and API secret are registered on the Aviator side.`
            : "";
        return {
          launchUrl: null as string | null,
          error: `Game server rejected the session (${res.status}${reason ? `: ${reason}` : ""}).${hint}`,
        };
      }
      const json = (await res.json()) as { launch_url?: string };
      if (!json.launch_url) return { launchUrl: null as string | null, error: "No launch URL returned." };
      return { launchUrl: json.launch_url, error: null as string | null };
    } catch {
      return { launchUrl: null as string | null, error: "Could not reach the game server." };
    }
  });
