"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { API_BASE_URL } from "@/lib/api/config";
import { refreshSession } from "@/lib/api/http";
import { readTokens } from "@/lib/api/token-storage";
import { queryKeys } from "@/lib/query/keys";

/** Which cached lists to refresh when the server says a topic changed. */
const TOPIC_KEYS: Record<string, readonly (readonly unknown[])[]> = {
  work_orders: [queryKeys.workOrders.all],
  monthly_work_orders: [queryKeys.monthlyWorkOrders.all, queryKeys.workOrders.all],
  programme_plans: [queryKeys.programmePlans.all],
  rate_cards: [queryKeys.rateCards.all, queryKeys.benchmarkSurveys.all],
  notifications: [queryKeys.notifications.all],
  reports: [queryKeys.reports.all],
  afes: [queryKeys.afes.all],
  farm_assessments: [["farm-assessments-owner"], ["farm-assessments"]],
  payments: [queryKeys.paymentRequests.all],
};

/**
 * Server push: keeps one stream open to /events and refreshes the affected lists the moment
 * something changes for this programme, so screens update without waiting for a poll.
 * Reconnects with back-off, and refreshes the session if the access token expired.
 */
export function LiveUpdates() {
  const qc = useQueryClient();
  const { activeProgram } = useCropfortAuth();
  const programId = activeProgram?.id;

  useEffect(() => {
    if (!programId) return;
    let stopped = false;
    let controller: AbortController | null = null;
    let retry = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Several writes often land together; refresh each topic once per burst
    const pending = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      flushTimer = null;
      for (const topic of pending) {
        for (const key of TOPIC_KEYS[topic] ?? []) void qc.invalidateQueries({ queryKey: key as unknown[] });
      }
      pending.clear();
    };
    const queue = (topic: string) => {
      if (!TOPIC_KEYS[topic]) return;
      pending.add(topic);
      if (!flushTimer) flushTimer = setTimeout(flush, 250);
    };

    const connect = async () => {
      if (stopped) return;
      controller = new AbortController();
      try {
        const token = readTokens()?.accessToken;
        const res = await fetch(`${API_BASE_URL}/events`, {
          headers: { Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          signal: controller.signal,
          cache: "no-store",
        });
        if (res.status === 401) {
          await refreshSession().catch(() => null);
          throw new Error("unauthorized");
        }
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        retry = 1000;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let split: number;
          while ((split = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            if (!frame.startsWith("event: change")) continue;
            const data = frame.split("\n").find((line) => line.startsWith("data: "));
            try {
              const { topic } = JSON.parse(data?.slice(6) || "{}") as { topic?: string };
              if (topic) queue(topic);
            } catch {
              /* ignore a malformed frame */
            }
          }
        }
      } catch {
        if (stopped) return;
      }
      if (stopped) return;
      // Dropped or failed: try again, waiting a little longer each time (max 30 s)
      timer = setTimeout(connect, retry);
      retry = Math.min(retry * 2, 30000);
    };

    void connect();
    return () => {
      stopped = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [programId, qc]);

  return null;
}
