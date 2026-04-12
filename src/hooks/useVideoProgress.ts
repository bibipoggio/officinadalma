import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VideoItem {
  url: string;
  title: string;
  position: number;
}

export interface VideoProgressEntry {
  video_index: number;
  last_position_seconds: number;
  progress_percent: number;
  is_completed: boolean;
}

export function useVideoProgress(lessonId: string, videos: VideoItem[]) {
  const { user } = useAuth();
  const [progressMap, setProgressMap] = useState<Record<number, VideoProgressEntry>>({});
  const [isLoading, setIsLoading] = useState(true);
  const lastSaveRef = useRef<Record<number, number>>({});

  // Fetch all video progress for this lesson
  const fetchProgress = useCallback(async () => {
    if (!user || !lessonId || videos.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("lesson_video_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);

      const map: Record<number, VideoProgressEntry> = {};
      (data || []).forEach((row: any) => {
        map[row.video_index] = {
          video_index: row.video_index,
          last_position_seconds: row.last_position_seconds,
          progress_percent: row.progress_percent,
          is_completed: row.is_completed,
        };
      });
      setProgressMap(map);
    } catch (err) {
      console.error("Error fetching video progress:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, lessonId, videos.length]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Save position for a specific video (throttled)
  const saveVideoPosition = useCallback(
    async (videoIndex: number, currentSeconds: number, durationSeconds?: number) => {
      if (!user || !lessonId) return;

      const now = Date.now();
      const lastSave = lastSaveRef.current[videoIndex] || 0;
      if (now - lastSave < 5000) return;
      lastSaveRef.current[videoIndex] = now;

      const percent = durationSeconds && durationSeconds > 0
        ? Math.min(100, Math.round((currentSeconds / durationSeconds) * 100))
        : 0;

      try {
        const { error } = await supabase
          .from("lesson_video_progress")
          .upsert(
            {
              user_id: user.id,
              lesson_id: lessonId,
              video_index: videoIndex,
              last_position_seconds: Math.round(currentSeconds),
              progress_percent: percent,
            },
            { onConflict: "user_id,lesson_id,video_index" }
          );

        if (!error) {
          setProgressMap(prev => ({
            ...prev,
            [videoIndex]: {
              ...prev[videoIndex],
              video_index: videoIndex,
              last_position_seconds: Math.round(currentSeconds),
              progress_percent: percent,
              is_completed: prev[videoIndex]?.is_completed || false,
            },
          }));
        }
      } catch (err) {
        console.error("Error saving video progress:", err);
      }
    },
    [user, lessonId]
  );

  // Mark a video as completed (for embeds or manual marking)
  const markVideoCompleted = useCallback(
    async (videoIndex: number) => {
      if (!user || !lessonId) return;

      try {
        const { error } = await supabase
          .from("lesson_video_progress")
          .upsert(
            {
              user_id: user.id,
              lesson_id: lessonId,
              video_index: videoIndex,
              last_position_seconds: 0,
              progress_percent: 100,
              is_completed: true,
            },
            { onConflict: "user_id,lesson_id,video_index" }
          );

        if (!error) {
          setProgressMap(prev => ({
            ...prev,
            [videoIndex]: {
              video_index: videoIndex,
              last_position_seconds: 0,
              progress_percent: 100,
              is_completed: true,
            },
          }));
        }
      } catch (err) {
        console.error("Error marking video completed:", err);
      }
    },
    [user, lessonId]
  );

  // Force save (for page unload)
  const forceSaveVideo = useCallback(
    async (videoIndex: number, currentSeconds: number, durationSeconds?: number) => {
      if (!user || !lessonId || currentSeconds <= 0) return;

      lastSaveRef.current[videoIndex] = 0; // Reset throttle
      const percent = durationSeconds && durationSeconds > 0
        ? Math.min(100, Math.round((currentSeconds / durationSeconds) * 100))
        : 0;

      try {
        await supabase
          .from("lesson_video_progress")
          .upsert(
            {
              user_id: user.id,
              lesson_id: lessonId,
              video_index: videoIndex,
              last_position_seconds: Math.round(currentSeconds),
              progress_percent: percent,
            },
            { onConflict: "user_id,lesson_id,video_index" }
          );
      } catch (err) {
        console.error("Error force saving video progress:", err);
      }
    },
    [user, lessonId]
  );

  const allCompleted = videos.length > 0 && videos.every((_, i) => progressMap[i]?.is_completed);
  const completedCount = videos.filter((_, i) => progressMap[i]?.is_completed).length;

  return {
    progressMap,
    isLoading,
    saveVideoPosition,
    markVideoCompleted,
    forceSaveVideo,
    allCompleted,
    completedCount,
    refetch: fetchProgress,
  };
}
