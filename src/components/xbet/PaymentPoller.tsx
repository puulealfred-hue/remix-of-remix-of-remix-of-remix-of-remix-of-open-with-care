import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import {
  settlePaymentSession,
  watchPendingSessions,
  type PaymentSession,
} from "@/lib/payment-sessions";
import { checkRequestStatus, formatMoney, readStatus } from "@/lib/payments";

const POLL_MS = 1000;
const MAX_AGE_MS = 15 * 60 * 1000;

/**
 * Resumes and drives every unfinished payment for the signed-in player.
 * It runs on every page, survives refreshes and never credits a session twice.
 */
export function PaymentPoller() {
  const { user } = useAuth();
  const sessionsRef = useRef<PaymentSession[]>([]);
  const workingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      sessionsRef.current = [];
      return;
    }
    const stop = watchPendingSessions(user.id, (list) => {
      sessionsRef.current = list;
    });
    return stop;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const tick = async () => {
      for (const session of sessionsRef.current) {
        if (!alive) return;
        if (workingRef.current.has(session.id)) continue;
        workingRef.current.add(session.id);
        try {
          if (!session.internalReference) {
            if (Date.now() - session.at > 60_000) {
              await settlePaymentSession(session, "failed", "No provider reference");
            }
            continue;
          }
          const res = await checkRequestStatus(session.internalReference);
          const state = res.ok ? readStatus(res.data) : "pending";
          if (state === "pending") {
            if (Date.now() - session.at > MAX_AGE_MS) {
              await settlePaymentSession(session, "failed", "Payment timed out");
              toast.error("Payment timed out", {
                description: `${session.kind === "deposit" ? "Deposit" : "Withdrawal"} ${formatMoney(session.amount, session.currency)}`,
              });
            }
            continue;
          }
          const applied = await settlePaymentSession(
            session,
            state,
            String(res.data.message ?? ""),
          );
          if (applied === "applied") {
            if (state === "success") {
              toast.success(
                session.kind === "deposit"
                  ? `Deposit confirmed — ${formatMoney(session.amount, session.currency)} added`
                  : `Withdrawal of ${formatMoney(session.amount, session.currency)} sent`,
                { description: session.method },
              );
            } else {
              toast.error(
                session.kind === "deposit"
                  ? "Deposit failed"
                  : "Withdrawal failed — your money was returned",
                { description: String(res.data.message ?? session.method) },
              );
            }
          }
        } catch {
          /* network hiccup — retried on the next tick */
        } finally {
          workingRef.current.delete(session.id);
        }
      }
    };

    const timer = setInterval(() => void tick(), POLL_MS);
    void tick();
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user]);

  return null;
}
