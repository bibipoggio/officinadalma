import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BasicCourse {
  id: string;
  route_slug: string;
  title: string;
  description_short: string | null;
  cover_image_url: string | null;
  type: string;
}

interface Lesson {
  id: string;
  title: string;
  summary: string | null;
}

export function useBasicCourse(slug: string = "perolas-de-sabedoria") {
  const [course, setCourse] = useState<BasicCourse | null>(null);
  const [latestLesson, setLatestLesson] = useState<Lesson | null>(null);
  const [totalLessons, setTotalLessons] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCourse = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch basic course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("route_slug", slug)
        .eq("is_published", true)
        .eq("type", "basic")
        .maybeSingle();

      if (courseError) throw courseError;
      if (!courseData) {
        setIsLoading(false);
        return;
      }

      setCourse(courseData as BasicCourse);

      // Count total published lessons
      const { count, error: countError } = await supabase
        .from("course_lessons")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseData.id)
        .eq("is_published", true);

      if (!countError && count !== null) {
        setTotalLessons(count);
      }

      // Fetch latest lesson (most recently released)
      const now = new Date().toISOString();
      const { data: lessonData, error: lessonError } = await supabase
        .from("course_lessons")
        .select("id, title, summary")
        .eq("course_id", courseData.id)
        .eq("is_published", true)
        .or(`released_at.is.null,released_at.lte.${now}`)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lessonError && lessonData) {
        setLatestLesson(lessonData as Lesson);
      }
    } catch (err) {
      console.error("Error fetching basic course:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  return {
    course,
    latestLesson,
    totalLessons,
    isLoading,
    error,
    refetch: fetchCourse,
  };
}
