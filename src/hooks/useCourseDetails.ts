import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "./useSubscription";

interface Course {
  id: string;
  title: string;
  route_slug: string;
  type: string;
  cover_image_url: string | null;
  description_short: string | null;
  is_published: boolean;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  is_published: boolean;
}

interface Lesson {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  summary: string | null;
  content_type: string;
  duration_seconds: number | null;
  access_level: string;
  position: number;
  is_published: boolean;
  released_at: string | null;
}

interface LessonProgress {
  lesson_id: string;
  progress_percent: number;
  completed_at: string | null;
}

export interface LessonWithProgress extends Lesson {
  progress: LessonProgress | null;
  isLocked: boolean;
}

export interface ModuleWithLessons extends Module {
  lessons: LessonWithProgress[];
}

export function useCourseDetails(slug: string) {
  const { user } = useAuth();
  const { isPremium, isLoading: loadingSubscription } = useSubscription();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [hasEnrollment, setHasEnrollment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCourse = useCallback(async () => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch course by slug
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("route_slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (courseError) throw courseError;
      if (!courseData) {
        setError(new Error("Curso não encontrado"));
        setIsLoading(false);
        return;
      }

      setCourse(courseData as Course);

      // Check enrollment if user is logged in
      let userHasEnrollment = false;
      if (user) {
        const { data: enrollmentData } = await supabase
          .from("course_enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseData.id)
          .maybeSingle();

        userHasEnrollment = !!enrollmentData;
        setHasEnrollment(userHasEnrollment);
      }

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseData.id)
        .eq("is_published", true)
        .order("position", { ascending: true });

      if (modulesError) throw modulesError;

      // Fetch lessons
      const now = new Date().toISOString();
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseData.id)
        .eq("is_published", true)
        .or(`released_at.is.null,released_at.lte.${now}`)
        .order("position", { ascending: true });

      if (lessonsError) throw lessonsError;

      // Fetch progress if user is logged in
      let progressMap = new Map<string, LessonProgress>();
      if (user && lessonsData && lessonsData.length > 0) {
        const lessonIds = lessonsData.map((l) => l.id);
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, progress_percent, completed_at")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds);

        if (progressData) {
          progressData.forEach((p) => {
            progressMap.set(p.lesson_id, p as LessonProgress);
          });
        }
      }

      // Determine access
      const isPremiumCourse = courseData.type === "aparte";
      const hasAccess = !isPremiumCourse || isPremium || userHasEnrollment;

      // Build modules with lessons
      const modulesWithLessons: ModuleWithLessons[] = (modulesData || []).map((mod) => {
        const moduleLessons = (lessonsData || [])
          .filter((l) => l.module_id === mod.id)
          .map((lesson) => {
            // Determine if lesson is locked
            let isLocked = false;
            if (isPremiumCourse && !hasAccess) {
              // Premium course without access - all locked
              isLocked = true;
            } else if (lesson.access_level === "premium" && !isPremium && !userHasEnrollment) {
              // Premium lesson without premium/enrollment
              isLocked = true;
            }

            return {
              ...lesson,
              progress: progressMap.get(lesson.id) || null,
              isLocked,
            } as LessonWithProgress;
          });

        return {
          ...mod,
          lessons: moduleLessons,
        } as ModuleWithLessons;
      });

      // Filter out modules with no lessons
      setModules(modulesWithLessons.filter((m) => m.lessons.length > 0));
    } catch (err) {
      console.error("Error fetching course:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [slug, user, isPremium]);

  useEffect(() => {
    if (!loadingSubscription) {
      fetchCourse();
    }
  }, [fetchCourse, loadingSubscription]);

  // Calculate overall progress
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = modules.reduce(
    (acc, m) => acc + m.lessons.filter((l) => l.progress?.completed_at).length,
    0
  );
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Check if user has any form of access
  const isPremiumCourse = course?.type === "aparte";
  const hasAccess = !isPremiumCourse || isPremium || hasEnrollment;

  return {
    course,
    modules,
    hasEnrollment,
    hasAccess,
    isPremiumCourse,
    totalLessons,
    completedLessons,
    overallProgress,
    isLoading: isLoading || loadingSubscription,
    error,
    refetch: fetchCourse,
  };
}

// Format duration in seconds to readable string
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
  return type === "aparte" ? "Premium" : "Básico";
}
