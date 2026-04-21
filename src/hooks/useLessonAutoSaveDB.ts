import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AutoSavePayload {
  title: string;
  access_level: string;
  content_type: string;
  media_url: string | null;
  audio_url: string | null;
  body_markdown: string | null;
  pdf_url: string | null;
  duration_seconds: number | null;
  audio_duration_seconds: number | null;
  released_at: string | null;
  summary: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  text_files_urls: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  videos: any;
}

interface UseLessonAutoSaveDBOptions {
  /** Existing lesson id. Required: this hook only saves into already-persisted rows. */
  lessonId: string | null;
  /** Latest form payload to persist as draft. */
  payload: AutoSavePayload | null;
  /** Debounce in ms (default 2000). */
  debounceMs?: number;
  /** Disable auto-save entirely. */
  enabled?: boolean;
}

/**
 * Persists lesson edits as a draft directly to the database with debounce.
 * Forces `is_published = false` to keep the row safely as draft until the user
 * explicitly publishes it.
 */
export function useLessonAutoSaveDB({
  lessonId,
  payload,
  debounceMs = 2000,
  enabled = true,
}: UseLessonAutoSaveDBOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSerializedRef = useRef<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !lessonId || !payload) return;

    // Skip empty form (no title and no content) to avoid noisy writes.
    const hasContent =
      payload.title.trim() ||
      (payload.body_markdown ?? "").trim() ||
      (payload.media_url ?? "").trim() ||
      (payload.audio_url ?? "").trim() ||
      (Array.isArray(payload.videos) && payload.videos.length > 0) ||
      (Array.isArray(payload.text_files_urls) && payload.text_files_urls.length > 0);
    if (!hasContent) return;

    const serialized = JSON.stringify(payload);
    if (serialized === lastSerializedRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      setError(null);
      try {
        const { error: updateError } = await supabase
          .from("course_lessons")
          .update({
            ...payload,
            // Auto-save NEVER publishes — rascunho only.
            is_published: false,
          })
          .eq("id", lessonId);

        if (updateError) {
          setError(updateError.message);
          console.error("[useLessonAutoSaveDB]", updateError);
          return;
        }

        lastSerializedRef.current = serialized;
        setLastSavedAt(new Date());
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, lessonId, payload, debounceMs]);

  return { isSaving, lastSavedAt, error };
}
