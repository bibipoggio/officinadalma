import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PublicDailyContent {
  id: string;
  date: string;
  tonica_title: string;
  tonica_short: string;
  tonica_full: string;
  tonica_practice: string;
  meditation_audio_url: string | null;
  meditation_duration_seconds: number | null;
  spotify_episode_url: string | null;
  cover_image_url: string | null;
}

export function useDailyContentForDate(date: string) {
  const [content, setContent] = useState<PublicDailyContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      if (!date) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("daily_content")
          .select(`
            id,
            date,
            tonica_title,
            tonica_short,
            tonica_full,
            tonica_practice,
            meditation_audio_url,
            meditation_duration_seconds,
            spotify_episode_url,
            cover_image_url
          `)
          .eq("date", date)
          .eq("published", true)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        setContent(data);
      } catch (err: any) {
        console.error("Error fetching daily content:", err);
        setError(err.message || "Erro ao carregar conteúdo");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [date]);

  return { content, isLoading, error };
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}