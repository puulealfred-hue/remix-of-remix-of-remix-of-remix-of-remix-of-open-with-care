import { createFileRoute } from "@tanstack/react-router";
import { firebaseConfig } from "@/lib/firebase-config";
import { AVIATOR } from "@/lib/aviator-config";

/**
 * Wallet endpoint the Aviator game calls server-to-server for every money
 * movement. The platform stays the source of truth for the balance.
 */

const BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const KEY = firebaseConfig.apiKey;

type FsValue = { integerValue?: string; doubleValue?: number; stringValue?: string; booleanValue?: boolean };
type FsDoc = { fields?: Record<string, FsValue> };

const num = (v: FsValue | undefined) =>
  v === undefined ? 0 : Number(v.integerValue ?? v.doubleValue ?? 0);

async function getDoc(path: string): Promise<FsDoc | null> {
  const res = await fetch(`${BASE}/${path}?key=${KEY}`);
  if (!res.ok) return null;
  return (await res.json()) as FsDoc;
}

async function patchDoc(path: string, fields: Record<string, FsValue>) {
  const mask = Object.keys(fields)
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");
  await fetch(`${BASE}/${path}?key=${KEY}&${mask}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fields }),
  });
}

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const Route = createFileRoute("/api/public/aviator/wallet")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["AVIATOR_API_SECRET"] || AVIATOR.secret;

        const expectedOperator = process.env["AVIATOR_OPERATOR_SLUG"] || AVIATOR.slug;
        const operator = request.headers.get("x-operator") ?? "";
        if (expectedOperator && operator !== expectedOperator) {
          return json({ error: "unknown_operator" }, 401);
        }

        const raw = await request.text();
        const signature = request.headers.get("x-signature") ?? "";
        const expected = await hmacHex(secret, raw);
        if (!timingSafeEqual(signature.toLowerCase(), expected)) {
          return json({ error: "invalid_signature" }, 401);
        }

        let payload: {
          action?: "debit" | "credit" | "balance";
          player_id?: string;
          amount?: number;
          currency?: string;
          reference?: string;
          reason?: string;
        };
        try {
          payload = JSON.parse(raw);
        } catch {
          return json({ error: "invalid_body" }, 400);
        }

        const playerId = payload.player_id;
        const action = payload.action;
        if (!playerId || !action) return json({ error: "invalid_payload" }, 400);

        const userPath = `users/${encodeURIComponent(playerId)}`;
        const user = await getDoc(userPath);
        if (!user) return json({ error: "unknown_player" }, 404);

        let cash = num(user.fields?.["balance"]);
        let bonus = num(user.fields?.["bonusBalance"]);
        const spendable = () => Math.round((cash + bonus) * 100) / 100;

        if (action === "balance") return json({ balance: spendable() });

        const amount = Number(payload.amount ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) return json({ error: "invalid_amount" }, 400);

        const reference = payload.reference;
        if (!reference) return json({ error: "missing_reference" }, 400);
        const refPath = `aviator_refs/${encodeURIComponent(reference)}`;

        // Idempotency: a reference is only ever applied once.
        const seen = await getDoc(refPath);
        if (seen) return json({ balance: num(seen.fields?.["balance"]), reference });

        if (action === "debit") {
          if (spendable() < amount) return json({ error: "insufficient_funds" }, 402);
          const fromBonus = Math.min(bonus, amount);
          bonus = Math.round((bonus - fromBonus) * 100) / 100;
          cash = Math.round((cash - (amount - fromBonus)) * 100) / 100;
        } else if (action === "credit") {
          cash = Math.round((cash + amount) * 100) / 100;
        } else {
          return json({ error: "unknown_action" }, 400);
        }

        await patchDoc(userPath, {
          balance: { doubleValue: cash },
          bonusBalance: { doubleValue: bonus },
        });
        await patchDoc(refPath, {
          balance: { doubleValue: spendable() },
          player: { stringValue: playerId },
          action: { stringValue: action },
          amount: { doubleValue: amount },
          at: { doubleValue: Date.now() },
        });

        // Ledger row so the movement shows in the platform's transactions.
        await fetch(`${BASE}/transactions?key=${KEY}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fields: {
              at: { doubleValue: Date.now() },
              userId: { stringValue: playerId },
              type: { stringValue: action === "debit" ? "bet" : "win" },
              method: { stringValue: "Aviator" },
              amount: { doubleValue: action === "debit" ? -amount : amount },
              status: { stringValue: "completed" },
              note: { stringValue: `Aviator ${payload.reason ?? action}` },
            },
          }),
        });

        return json({ balance: spendable(), reference });
      },
    },
  },
});
