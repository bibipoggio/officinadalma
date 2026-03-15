import { useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AnalyticsPeriod } from "@/hooks/useEnhancedAnalytics";

type MeditationEventType = "opened" | "play_started" | "progress" | "completed";

// ── Tracking hook for the meditation player ──
export function useMeditationTracking() {
  const trackedRef = useRef<Set<string>>(new Set());

  const trackEvent = useCallback(
    async (
      meditationId: string,
      eventType: MeditationEventType,
      extra?: { progress_percent?: number; progress_seconds?: number }
    ) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // For completed events, use upsert with the dedup index
        if (eventType === "completed") {
          const today = new Date().toISOString().slice(0, 10);
          await supabase.from("meditation_analytics_events" as any).upsert(
            {
              user_id: user.id,
              meditation_id: meditationId,
              event_type: eventType,
              session_date: today,
              progress_percent: extra?.progress_percent ?? 100,
              progress_seconds: extra?.progress_seconds ?? null,
            } as any,
            { onConflict: "user_id,meditation_id,session_date,event_type" }
          );
          return;
        }

        // For opened/play_started, deduplicate in-memory per session
        const dedupeKey = `${meditationId}_${eventType}`;
        if (
          (eventType === "opened" || eventType === "play_started") &&
          trackedRef.current.has(dedupeKey)
        ) {
          return;
        }

        await supabase.from("meditation_analytics_events" as any).insert({
          user_id: user.id,
          meditation_id: meditationId,
          event_type: eventType,
          progress_percent: extra?.progress_percent ?? null,
          progress_seconds: extra?.progress_seconds ?? null,
        } as any);

        if (eventType === "opened" || eventType === "play_started") {
          trackedRef.current.add(dedupeKey);
        }
      } catch (err) {
        console.error(`Error tracking meditation ${eventType}:`, err);
      }
    },
    []
  );

  const trackOpened = useCallback(
    (meditationId: string) => trackEvent(meditationId, "opened"),
    [trackEvent]
  );

  const trackPlayStarted = useCallback(
    (meditationId: string) => trackEvent(meditationId, "play_started"),
    [trackEvent]
  );

  const trackProgress = useCallback(
    (meditationId: string, percent: number, seconds: number) =>
      trackEvent(meditationId, "progress", {
        progress_percent: percent,
        progress_seconds: seconds,
      }),
    [trackEvent]
  );

  const trackCompleted = useCallback(
    (meditationId: string, seconds?: number) =>
      trackEvent(meditationId, "completed", {
        progress_percent: 100,
        progress_seconds: seconds,
      }),
    [trackEvent]
  );

  return { trackOpened, trackPlayStarted, trackProgress, trackCompleted };
}

// ── Admin funnel analytics query ──
export interface MeditationFunnelData {
  opened: number;
  play_started: number;
  completed: number;
  unique_completed_users: number;
  avg_per_user: number;
  rate_open_to_play: number;
  rate_play_to_complete: number;
  rate_open_to_complete: number;
}

export function useMeditationFunnelAnalytics(period: AnalyticsPeriod = "all") {
  return useQuery({
    queryKey: ["meditation-funnel", period],
    queryFn: async (): Promise<MeditationFunnelData> => {
      const { data, error } = await supabase.rpc(
        "get_meditation_funnel_analytics" as any,
        { p_period: period } as any
      );
      if (error) throw error;
      return data as unknown as MeditationFunnelData;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
