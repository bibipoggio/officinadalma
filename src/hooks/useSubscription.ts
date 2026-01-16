import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth } from "date-fns";

export interface Subscription {
  id: string;
  user_id: string;
  provider: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

export interface SubscriptionStatus {
  isPremium: boolean;
  isTrialing: boolean;
  subscription: Subscription | null;
  isLoading: boolean;
}

export function useSubscription(): SubscriptionStatus {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        // Use user_subscriptions view to avoid exposing sensitive payment provider IDs
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("id, user_id, provider, current_period_end, trial_ends_at, status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        setSubscription(data);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const now = new Date();
  
  const isTrialing = subscription?.trial_ends_at 
    ? new Date(subscription.trial_ends_at) > now 
    : false;

  const hasActiveSubscription = subscription?.current_period_end
    ? new Date(subscription.current_period_end) > now
    : false;

  const isPremium = isTrialing || hasActiveSubscription;

  return {
    isPremium,
    isTrialing,
    subscription,
    isLoading,
  };
}

export interface DailyContent {
  id: string;
  date: string;
  tonica_title: string;
  tonica_short: string;
  tonica_full: string;
  tonica_practice: string;
  meditation_audio_url: string | null;
  meditation_duration_seconds: number | null;
  spotify_episode_url: string | null;
  published: boolean;
}

export function useDailyContentForDate(date: string) {
  const [content, setContent] = useState<DailyContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("daily_content")
        .select("*")
        .eq("date", date)
        .eq("published", true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setContent(data);
    } catch (err) {
      console.error("Error fetching daily content:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return { content, isLoading, error, refetch: fetchContent };
}

export type ShareMode = "private" | "community" | "anonymous";

export interface Checkin {
  id: string;
  user_id: string;
  date: string;
  energy: number;
  feeling_text: string;
  share_mode: ShareMode;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export function useCheckin(date: string) {
  const { user } = useAuth();
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCheckin = useCallback(async () => {
    if (!user) {
      setCheckin(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("checkins")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setCheckin(data as Checkin | null);
    } catch (err) {
      console.error("Error fetching checkin:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    fetchCheckin();
  }, [fetchCheckin]);

  const saveCheckin = async (data: {
    energy: number;
    feeling_text: string;
    share_mode: ShareMode;
    published: boolean;
  }) => {
    if (!user) return { success: false, error: new Error("User not authenticated") };

    setIsSaving(true);
    try {
      if (checkin) {
        // Update existing
        const { error: updateError } = await supabase
          .from("checkins")
          .update({
            energy: data.energy,
            feeling_text: data.feeling_text,
            share_mode: data.share_mode,
            published: data.published,
          })
          .eq("id", checkin.id);

        if (updateError) throw updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from("checkins")
          .insert({
            user_id: user.id,
            date,
            energy: data.energy,
            feeling_text: data.feeling_text,
            share_mode: data.share_mode,
            published: data.published,
          });

        if (insertError) throw insertError;
      }

      await fetchCheckin();
      return { success: true, error: null };
    } catch (err) {
      console.error("Error saving checkin:", err);
      return { success: false, error: err as Error };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    checkin,
    isLoading,
    isSaving,
    error,
    saveCheckin,
    refetch: fetchCheckin,
  };
}

export function useMonthlyStreak() {
  const { user } = useAuth();
  const [streakDays, setStreakDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStreakDays(0);
      setIsLoading(false);
      return;
    }

    const fetchStreak = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        const firstDayOfMonth = startOfMonth(today);
        const todayStr = format(today, "yyyy-MM-dd");
        const firstDayStr = format(firstDayOfMonth, "yyyy-MM-dd");

        const { data, error } = await supabase
          .from("checkins")
          .select("date")
          .eq("user_id", user.id)
          .gte("date", firstDayStr)
          .lte("date", todayStr);

        if (error) throw error;

        // Count unique dates
        const uniqueDates = new Set(data?.map(c => c.date) || []);
        setStreakDays(uniqueDates.size);
      } catch (error) {
        console.error("Error fetching monthly streak:", error);
        setStreakDays(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreak();
  }, [user]);

  return { streakDays, isLoading };
}
