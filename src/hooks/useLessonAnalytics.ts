import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

interface LessonAnalyticsData {
  total_views: number;
  total_completions: number;
  unique_users: number;
  completion_rate: number;
}

interface TopLesson {
  lesson_id: string;
  lesson_title: string;
  course_title: string;
  view_count: number;
  completion_count: number;
}

interface CourseEngagement {
  course_id: string;
  course_title: string;
  total_lessons: number;
  avg_progress: number;
  enrolled_users: number;
}

// Hook para admins visualizarem analytics
export function useAdminLessonAnalytics() {
  const analyticsQuery = useQuery({
    queryKey: ["lesson-analytics"],
    queryFn: async (): Promise<LessonAnalyticsData> => {
      const { data, error } = await supabase.rpc("get_lesson_analytics");
      if (error) throw error;
      return data as unknown as LessonAnalyticsData;
    },
    staleTime: 1000 * 60 * 5,
  });

  const topLessonsQuery = useQuery({
    queryKey: ["top-lessons"],
    queryFn: async (): Promise<TopLesson[]> => {
      const { data, error } = await supabase.rpc("get_top_lessons", {
        limit_count: 10,
      });
      if (error) throw error;
      return (data as unknown as TopLesson[]) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const engagementQuery = useQuery({
    queryKey: ["course-engagement"],
    queryFn: async (): Promise<CourseEngagement[]> => {
      const { data, error } = await supabase.rpc("get_course_engagement");
      if (error) throw error;
      return (data as unknown as CourseEngagement[]) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    analytics: analyticsQuery.data,
    topLessons: topLessonsQuery.data || [],
    courseEngagement: engagementQuery.data || [],
    isLoading:
      analyticsQuery.isLoading ||
      topLessonsQuery.isLoading ||
      engagementQuery.isLoading,
    error: analyticsQuery.error || topLessonsQuery.error || engagementQuery.error,
    refetch: () => {
      analyticsQuery.refetch();
      topLessonsQuery.refetch();
      engagementQuery.refetch();
    },
  };
}

// Hook para tracking de ações do usuário
export function useLessonTracking() {
  const { user } = useAuth();

  const trackView = useCallback(
    async (lessonId: string) => {
      if (!user) return;

      try {
        await supabase.from("lesson_analytics").insert({
          user_id: user.id,
          lesson_id: lessonId,
          action: "view",
        });
      } catch (err) {
        console.error("Error tracking lesson view:", err);
      }
    },
    [user]
  );

  const trackComplete = useCallback(
    async (lessonId: string) => {
      if (!user) return;

      try {
        await supabase.from("lesson_analytics").insert({
          user_id: user.id,
          lesson_id: lessonId,
          action: "complete",
        });
      } catch (err) {
        console.error("Error tracking lesson completion:", err);
      }
    },
    [user]
  );

  return { trackView, trackComplete };
}
