import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import type { Checkin, ShareMode } from "./useSubscription";

export interface CheckinWithProfile extends Checkin {
  profiles?: {
    display_name: string | null;
  } | null;
}

interface Course {
  id: string;
  title: string;
  route_slug: string;
  type: string;
  cover_image_url: string | null;
  description_short: string | null;
}

interface Enrollment {
  id: string;
  course_id: string;
  access_type: string;
  courses: Course;
}

export interface FilterState {
  period: "all" | "7days" | "30days" | "thisMonth";
  visibility: "all" | "published" | "unpublished";
  shareMode: "all" | "private" | "community" | "anonymous";
}

// Fetch checkins for the current month (for calendar)
export function useMonthlyCheckins() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCheckins = useCallback(async () => {
    if (!user) {
      setCheckins([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const today = new Date();
      const firstDay = format(startOfMonth(today), "yyyy-MM-dd");
      const lastDay = format(endOfMonth(today), "yyyy-MM-dd");

      const { data, error: fetchError } = await supabase
        .from("checkins")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", firstDay)
        .lte("date", lastDay)
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;
      setCheckins((data as Checkin[]) || []);
    } catch (err) {
      console.error("Error fetching monthly checkins:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  return { checkins, isLoading, error, refetch: fetchCheckins };
}

// Fetch all user checkins with filtering and pagination
export function useCheckinHistory(filters: FilterState, page: number = 1, pageSize: number = 10) {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCheckins = useCallback(async () => {
    if (!user) {
      setCheckins([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("checkins")
        .select("*", { count: "exact" })
        .eq("user_id", user.id);

      // Apply period filter
      const today = new Date();
      if (filters.period === "7days") {
        query = query.gte("date", format(subDays(today, 6), "yyyy-MM-dd"));
      } else if (filters.period === "30days") {
        query = query.gte("date", format(subDays(today, 29), "yyyy-MM-dd"));
      } else if (filters.period === "thisMonth") {
        query = query.gte("date", format(startOfMonth(today), "yyyy-MM-dd"));
      }

      // Apply visibility filter
      if (filters.visibility === "published") {
        query = query.eq("published", true);
      } else if (filters.visibility === "unpublished") {
        query = query.eq("published", false);
      }

      // Apply share mode filter
      if (filters.shareMode !== "all") {
        query = query.eq("share_mode", filters.shareMode);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error: fetchError, count } = await query
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;
      setCheckins((data as Checkin[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error fetching checkin history:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, page, pageSize]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return { checkins, totalCount, totalPages, isLoading, error, refetch: fetchCheckins };
}

// Update an existing checkin
export function useUpdateCheckin() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCheckin = async (
    checkinId: string,
    data: {
      energy: number;
      feeling_text: string;
      share_mode: ShareMode;
      published: boolean;
    }
  ) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("checkins")
        .update({
          energy: data.energy,
          feeling_text: data.feeling_text,
          share_mode: data.share_mode,
          published: data.published,
        })
        .eq("id", checkinId);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      console.error("Error updating checkin:", err);
      return { success: false, error: err as Error };
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateCheckin, isUpdating };
}

// Fetch user's enrolled courses
export function useMyEnrollments() {
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
            description_short
          )
        `)
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;
      
      // Filter to only include published courses
      const validEnrollments = (data || []).filter(
        (e: any) => e.courses && e.courses.is_published !== false
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

// Get energy color class based on value
export function getEnergyColor(energy: number): string {
  if (energy <= 2) return "bg-gray-300 dark:bg-gray-600"; // Cinza frio
  if (energy <= 4) return "bg-blue-200 dark:bg-blue-800"; // Azul-lavanda
  if (energy <= 6) return "bg-purple-200 dark:bg-purple-700"; // Lavender
  if (energy <= 8) return "bg-amethyst-light dark:bg-amethyst-dark"; // Ametista
  return "bg-primary/70 dark:bg-primary"; // Ametista mais viva
}

export function getEnergyBadgeColor(energy: number): string {
  if (energy <= 2) return "bg-gray-200 text-gray-700";
  if (energy <= 4) return "bg-blue-100 text-blue-700";
  if (energy <= 6) return "bg-purple-100 text-purple-700";
  if (energy <= 8) return "bg-amethyst-light text-amethyst-dark";
  return "bg-primary/20 text-primary";
}
