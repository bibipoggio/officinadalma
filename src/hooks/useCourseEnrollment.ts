import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCourseEnrollment() {
  const { user } = useAuth();
  const [isEnrolling, setIsEnrolling] = useState(false);

  const enrollInCourse = async (courseId: string, accessType: string = "enrolled") => {
    if (!user) {
      return { success: false, error: new Error("Usuário não autenticado") };
    }

    setIsEnrolling(true);
    try {
      // Check if already enrolled
      const { data: existing } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();

      if (existing) {
        return { success: true, alreadyEnrolled: true, error: null };
      }

      // Enroll user
      const { error: insertError } = await supabase
        .from("course_enrollments")
        .insert({
          user_id: user.id,
          course_id: courseId,
          access_type: accessType,
        });

      if (insertError) throw insertError;
      return { success: true, alreadyEnrolled: false, error: null };
    } catch (err) {
      console.error("Error enrolling in course:", err);
      return { success: false, error: err as Error };
    } finally {
      setIsEnrolling(false);
    }
  };

  return { enrollInCourse, isEnrolling };
}
