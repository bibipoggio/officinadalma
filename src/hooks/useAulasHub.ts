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

interface Enrollment {
  id: string;
  course_id: string;
  access_type: string;
  courses: Course;
}

export function useMyEnrolledCourses() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEnrollments = useCallback(async () => {
    if (!user) {
      setEnrollments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("course_enrollments")
        .select(`
          id,
          course_id,
          access_type,
          courses (
            id,
            title,
            route_slug,
            type,
            cover_image_url,
            description_short,
            is_published
          )
        `)
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      // Filter to only include published courses
      const validEnrollments = (data || []).filter(
        (e: any) => e.courses && e.courses.is_published === true
      ) as Enrollment[];

      setEnrollments(validEnrollments);
    } catch (err) {
      console.error("Error fetching enrollments:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  return { enrollments, isLoading, error, refetch: fetchEnrollments };
}

export function useCourseCatalog() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("courses")
        .select("id, title, route_slug, type, cover_image_url, description_short, is_published")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setCourses((data as Course[]) || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return { courses, isLoading, error, refetch: fetchCourses };
}

export function useAulasHub() {
  const { enrollments, isLoading: loadingEnrollments, error: enrollmentsError, refetch: refetchEnrollments } = useMyEnrolledCourses();
  const { courses: catalogCourses, isLoading: loadingCatalog, error: catalogError, refetch: refetchCatalog } = useCourseCatalog();
  const { isPremium, isLoading: loadingSubscription } = useSubscription();

  const isLoading = loadingEnrollments || loadingCatalog || loadingSubscription;
  const error = enrollmentsError || catalogError;

  // Get enrolled course IDs for quick lookup
  const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id));

  // Filter catalog to show courses user is NOT enrolled in
  const availableCourses = catalogCourses.filter((c) => !enrolledCourseIds.has(c.id));

  const refetch = () => {
    refetchEnrollments();
    refetchCatalog();
  };

  return {
    enrollments,
    availableCourses,
    isPremium,
    isLoading,
    error,
    refetch,
  };
}

// Get course type label
export function getCourseTypeLabel(type: string): string {
  if (type === "aparte") return "Premium";
  if (type === "basic") return "Gratuito";
  return "Básico";
}
