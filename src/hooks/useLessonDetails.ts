import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "./useSubscription";

// Check if user is moderator or admin
async function checkIsModeratorOrAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("is_moderator_or_admin", { _user_id: userId });
  return !!data;
}

interface Course {
  id: string;
  title: string;
  route_slug: string;
  type: string;
}

export interface TextFile {
  url: string;
  name: string;
}

interface Lesson {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  summary: string | null;
  body_markdown: string | null;
  content_type: string;
  media_url: string | null;
  audio_url: string | null;
  pdf_url: string | null;
  text_files_urls: TextFile[] | null;
  duration_seconds: number | null;
  audio_duration_seconds: number | null;
  access_level: string;
  position: number;
  is_published: boolean;
  released_at: string | null;
}

interface LessonProgress {
  id: string;
  lesson_id: string;
  progress_percent: number;
  last_position_seconds: number;
  completed_at: string | null;
}

interface AdjacentLesson {
  id: string;
  title: string;
}

export function useLessonDetails(lessonId: string, courseSlug: string) {
  const { user } = useAuth();
  const { isPremium, isLoading: loadingSubscription } = useSubscription();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [hasEnrollment, setHasEnrollment] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [prevLesson, setPrevLesson] = useState<AdjacentLesson | null>(null);
  const [nextLesson, setNextLesson] = useState<AdjacentLesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const fetchLesson = useCallback(async () => {
    if (!lessonId || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      
      // Check if user is admin/moderator (they can see unpublished lessons)
      const isAdmin = await checkIsModeratorOrAdmin(user.id);

      // Fetch lesson - admins can see all, regular users only published
      let query = supabase
        .from("course_lessons")
        .select("*")
        .eq("id", lessonId);
      
      // Only apply publish filters for non-admin users
      if (!isAdmin) {
        query = query
          .eq("is_published", true)
          .or(`released_at.is.null,released_at.lte.${now}`);
      }
      
      const { data: lessonData, error: lessonError } = await query.maybeSingle();

      if (lessonError) throw lessonError;
      if (!lessonData) {
        setError(new Error("Aula não encontrada"));
        setIsLoading(false);
        return;
      }

      // Parse text_files_urls from JSON
      const parsedLesson: Lesson = {
        ...lessonData,
        text_files_urls: Array.isArray(lessonData.text_files_urls) 
          ? lessonData.text_files_urls as unknown as TextFile[]
          : null,
      };
      setLesson(parsedLesson);

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, title, route_slug, type")
        .eq("id", lessonData.course_id)
        .maybeSingle();

      if (courseError) throw courseError;
      if (!courseData) {
        setError(new Error("Curso não encontrado"));
        setIsLoading(false);
        return;
      }

      setCourse(courseData as Course);

      // Check enrollment
      const { data: enrollmentData } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseData.id)
        .maybeSingle();

      const userHasEnrollment = !!enrollmentData;
      setHasEnrollment(userHasEnrollment);

      // Determine if locked
      const isPremiumCourse = courseData.type === "aparte";
      const isPremiumLesson = lessonData.access_level === "premium";
      const hasAccess = isPremium || userHasEnrollment;

      const locked = (isPremiumCourse && !hasAccess) || (isPremiumLesson && !hasAccess);
      setIsLocked(locked);

      // Fetch progress if not locked
      if (!locked) {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId)
          .maybeSingle();

        if (progressData) {
          setProgress(progressData as LessonProgress);
        } else {
          // Create initial progress
          const { data: newProgress, error: createError } = await supabase
            .from("lesson_progress")
            .insert({
              user_id: user.id,
              lesson_id: lessonId,
              progress_percent: 0,
              last_position_seconds: 0,
            })
            .select()
            .single();

          if (!createError && newProgress) {
            setProgress(newProgress as LessonProgress);
          }
        }
      }

      // Fetch adjacent lessons (same module)
      const { data: moduleLessons } = await supabase
        .from("course_lessons")
        .select("id, title, position")
        .eq("module_id", lessonData.module_id)
        .eq("is_published", true)
        .or(`released_at.is.null,released_at.lte.${now}`)
        .order("position", { ascending: true });

      if (moduleLessons) {
        const currentIndex = moduleLessons.findIndex((l) => l.id === lessonId);
        if (currentIndex > 0) {
          const prev = moduleLessons[currentIndex - 1];
          setPrevLesson({ id: prev.id, title: prev.title });
        } else {
          setPrevLesson(null);
        }
        if (currentIndex < moduleLessons.length - 1) {
          const next = moduleLessons[currentIndex + 1];
          setNextLesson({ id: next.id, title: next.title });
        } else {
          setNextLesson(null);
        }
      }
    } catch (err) {
      console.error("Error fetching lesson:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, user, isPremium]);

  useEffect(() => {
    if (!loadingSubscription) {
      fetchLesson();
    }
  }, [fetchLesson, loadingSubscription]);

  return {
    lesson,
    course,
    progress,
    hasEnrollment,
    prevLesson,
    nextLesson,
    isLoading: isLoading || loadingSubscription,
    isLocked,
    error,
    refetch: fetchLesson,
    setProgress,
  };
}

export function useLessonProgress(lessonId: string, durationSeconds: number | null) {
  const { user } = useAuth();
  const lastSaveRef = useRef<number>(0);
  const lastPositionRef = useRef<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Force save without throttling (for page unload scenarios)
  const forceSave = useCallback(
    async (currentSeconds: number) => {
      if (!user || !lessonId || currentSeconds <= 0) return;

      try {
        const percent = durationSeconds && durationSeconds > 0
          ? Math.min(100, Math.round((currentSeconds / durationSeconds) * 100))
          : 0;

        await supabase
          .from("lesson_progress")
          .update({
            last_position_seconds: Math.round(currentSeconds),
            progress_percent: percent,
          })
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);
      } catch (err) {
        console.error("Error force saving progress:", err);
      }
    },
    [user, lessonId, durationSeconds]
  );

  const updateProgress = useCallback(
    async (data: {
      progress_percent?: number;
      last_position_seconds?: number;
      completed_at?: string | null;
    }) => {
      if (!user || !lessonId) return;

      // Throttle regular saves to every 5 seconds minimum (reduced from 10)
      const now = Date.now();
      if (now - lastSaveRef.current < 5000 && !data.completed_at) {
        return;
      }
      lastSaveRef.current = now;

      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("lesson_progress")
          .update(data)
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);

        if (error) throw error;
      } catch (err) {
        console.error("Error updating progress:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [user, lessonId]
  );

  const savePosition = useCallback(
    (currentSeconds: number) => {
      // Always update the ref for page unload saves
      lastPositionRef.current = currentSeconds;

      if (!durationSeconds || durationSeconds <= 0) {
        updateProgress({ last_position_seconds: Math.round(currentSeconds) });
        return;
      }

      const percent = Math.min(100, Math.round((currentSeconds / durationSeconds) * 100));
      updateProgress({
        last_position_seconds: Math.round(currentSeconds),
        progress_percent: percent,
      });
    },
    [durationSeconds, updateProgress]
  );

  const markCompleted = useCallback(async () => {
    if (!user || !lessonId) return { success: false };

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("lesson_progress")
        .update({
          progress_percent: 100,
          completed_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error marking completed:", err);
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  }, [user, lessonId]);

  // Save progress when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lastPositionRef.current > 0) {
        // Use sendBeacon for reliable save on page close
        const percent = durationSeconds && durationSeconds > 0
          ? Math.min(100, Math.round((lastPositionRef.current / durationSeconds) * 100))
          : 0;
        
        // Fallback: trigger immediate save
        forceSave(lastPositionRef.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && lastPositionRef.current > 0) {
        forceSave(lastPositionRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      // Save on unmount as well
      if (lastPositionRef.current > 0) {
        forceSave(lastPositionRef.current);
      }
    };
  }, [forceSave, durationSeconds]);

  return {
    updateProgress,
    savePosition,
    markCompleted,
    isSaving,
    forceSave,
  };
}

// Format duration
export function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
}

// Get course type label
export function getCourseTypeLabel(type: string): string {
  if (type === "aparte") return "Premium";
  if (type === "basic") return "Gratuito";
  return "Básico";
}
