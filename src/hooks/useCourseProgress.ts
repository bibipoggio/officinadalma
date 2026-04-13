import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

export function useCourseProgress(courseIds: string[]) {
  const { user } = useAuth();
  const [progressMap, setProgressMap] = useState<Map<string, CourseProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user || courseIds.length === 0) {
      setProgressMap(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch all lessons for the courses
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("id, course_id")
        .in("course_id", courseIds)
        .is("deleted_at", null)
        .eq("is_published", true);

      if (lessonsError) throw lessonsError;

      if (!lessonsData || lessonsData.length === 0) {
        setProgressMap(new Map());
        setIsLoading(false);
        return;
      }

      // Count lessons per course
      const lessonCountByCourse = new Map<string, number>();
      const lessonIds: string[] = [];
      
      lessonsData.forEach((lesson) => {
        lessonIds.push(lesson.id);
        lessonCountByCourse.set(
          lesson.course_id,
          (lessonCountByCourse.get(lesson.course_id) || 0) + 1
        );
      });

      // Fetch user's progress for these lessons
      const { data: progressData, error: progressError } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed_at")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds);

      if (progressError) throw progressError;

      // Create a set of completed lesson IDs
      const completedLessonIds = new Set(
        (progressData || [])
          .filter((p) => p.completed_at)
          .map((p) => p.lesson_id)
      );

      // Map lesson_id to course_id
      const lessonToCourse = new Map<string, string>();
      lessonsData.forEach((l) => lessonToCourse.set(l.id, l.course_id));

      // Count completed lessons per course
      const completedCountByCourse = new Map<string, number>();
      completedLessonIds.forEach((lessonId) => {
        const courseId = lessonToCourse.get(lessonId);
        if (courseId) {
          completedCountByCourse.set(
            courseId,
            (completedCountByCourse.get(courseId) || 0) + 1
          );
        }
      });

      // Build progress map
      const newProgressMap = new Map<string, CourseProgress>();
      courseIds.forEach((courseId) => {
        const totalLessons = lessonCountByCourse.get(courseId) || 0;
        const completedLessons = completedCountByCourse.get(courseId) || 0;
        const progressPercent = totalLessons > 0 
          ? Math.round((completedLessons / totalLessons) * 100) 
          : 0;

        newProgressMap.set(courseId, {
          courseId,
          totalLessons,
          completedLessons,
          progressPercent,
        });
      });

      setProgressMap(newProgressMap);
    } catch (err) {
      console.error("Error fetching course progress:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, courseIds.join(",")]); // Join to create stable dependency

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const getProgress = (courseId: string): CourseProgress | null => {
    return progressMap.get(courseId) || null;
  };

  return { progressMap, getProgress, isLoading, refetch: fetchProgress };
}
