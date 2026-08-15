import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/components/xbet/AuthContext";
import { createAviatorLaunch } from "@/lib/aviator.functions";

export const Route = createFileRoute("/aviator")({
  head: () => ({
    meta: [
      { title: "Aviator Crash Game — BET PLUS+" },
      {
        name: "description",
        content:
          "Play the live Aviator crash game at BET PLUS+: place a stake, watch the multiplier climb and cash out before the plane flies away.",
      },
      { property: "og:title", content: "Aviator Crash Game — BET PLUS+" },
      {
        property: "og:description",
        content: "Live crash game with instant cash-out, played straight from your BET PLUS+ balance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AviatorPage,
});

function AviatorPage() {
  const { user, openLogin, openRegister, loading } = useAuth();
  const launch = useServerFn(createAviatorLaunch);
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Keep the latest user details in a ref so balance updates never re-trigger a
  // launch (which would reload the iframe mid-game).
  const userRef = useRef(user);
  userRef.current = user;
  const launchRef = useRef(launch);
  launchRef.current = launch;
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setLaunchUrl(null);
      return;
    }
    const current = userRef.current;
    if (!current) return;
    let active = true;
    setPending(true);
    setError(null);
    launchRef
      .current({
        data: {
          playerId: current.id,
          playerName: current.name || current.label,
          currency: current.currency,
        },
      })
      .then((res) => {
        if (!active) return;
        setLaunchUrl(res.launchUrl);
        setError(res.error);
      })
      .catch(() => active && setError("Could not start the game right now."))
      .finally(() => active && setPending(false));
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if ((e.data as { type?: string } | null)?.type === "aviator:devtools-blocked") {
        setError("Developer tools are not allowed while playing.");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-black">
      <Link
        to="/"
        className="absolute left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xb-on-dark transition-colors hover:bg-white/20"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      {launchUrl ? (
        <iframe
          key={launchUrl}
          src={launchUrl}
          allow="autoplay; fullscreen"
          title="Aviator"
          className="h-full w-full border-0"
        />
      ) : !userId && !loading ? (
        <iframe
          src="https://aviator-betplus.vercel.app"
          title="Aviator preview"
          tabIndex={-1}
          className="pointer-events-none h-full w-full border-0"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-white/70">
          {!userId
            ? "Checking your session…"
            : pending
              ? "Starting your game session…"
              : (error ?? "Game unavailable.")}
        </div>
      )}

      {!userId && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-xb-line bg-xb-panel p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-xb-odds">
              <Lock className="h-5 w-5 text-xb-blue" />
            </div>
            <h2 className="text-base font-black text-xb-text">Aviator is locked</h2>
            <p className="mt-1 text-[12px] text-xb-text-muted">
              Log in or create an account to play Aviator with your BET PLUS+ balance.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={openLogin}
                className="w-full rounded-xl bg-xb-green py-3 text-[13px] font-bold text-xb-on-dark transition-colors hover:bg-xb-green-dark"
              >
                LOG IN
              </button>
              <button
                type="button"
                onClick={openRegister}
                className="w-full rounded-xl bg-xb-blue py-3 text-[13px] font-bold text-xb-on-dark"
              >
                REGISTER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
