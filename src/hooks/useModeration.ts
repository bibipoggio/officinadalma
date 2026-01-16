import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type ReportStatus = Database["public"]["Enums"]["report_status"];

export interface Report {
  id: string;
  checkin_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
}

export interface ReportWithCheckin extends Report {
  checkin?: {
    id: string;
    user_id: string;
    date: string;
    energy: number;
    feeling_text: string;
    share_mode: string;
    published: boolean;
    display_name: string | null;
  } | null;
}

export function useModeration() {
  const { hasAdminAccess } = useAuth();
  const [reports, setReports] = useState<ReportWithCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("pending");

  const fetchReports = useCallback(async () => {
    if (!hasAdminAccess) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch reports using the anonymous_reports view
      let query = supabase
        .from("anonymous_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        return;
      }

      // Fetch related checkins
      const checkinIds = reportsData
        .map(r => r.checkin_id)
        .filter((id): id is string => id !== null);

      let checkinsMap: Record<string, ReportWithCheckin["checkin"]> = {};

      if (checkinIds.length > 0) {
        const { data: checkinsData } = await supabase
          .from("checkins")
          .select("id, user_id, date, energy, feeling_text, share_mode, published")
          .in("id", checkinIds);

        if (checkinsData) {
          // Get display names for community checkins
          const communityUserIds = checkinsData
            .filter(c => c.share_mode === "community")
            .map(c => c.user_id);

          let profilesMap: Record<string, string | null> = {};
          if (communityUserIds.length > 0) {
            const { data: profiles } = await supabase
              .from("public_profiles")
              .select("id, display_name")
              .in("id", communityUserIds);

            if (profiles) {
              profilesMap = profiles.reduce((acc, p) => {
                acc[p.id] = p.display_name;
                return acc;
              }, {} as Record<string, string | null>);
            }
          }

          checkinsData.forEach(c => {
            checkinsMap[c.id] = {
              ...c,
              display_name: c.share_mode === "community" ? profilesMap[c.user_id] || null : null,
            };
          });
        }
      }

      // Combine reports with checkins
      const processedReports: ReportWithCheckin[] = reportsData
        .filter((r): r is Report => r.id !== null && r.checkin_id !== null && r.reason !== null && r.status !== null && r.created_at !== null)
        .map(r => ({
          id: r.id!,
          checkin_id: r.checkin_id!,
          reason: r.reason!,
          status: r.status!,
          created_at: r.created_at!,
          checkin: r.checkin_id ? checkinsMap[r.checkin_id] || null : null,
        }));

      setReports(processedReports);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [hasAdminAccess, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateReportStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", reportId);

      if (error) throw error;

      // Update local state
      setReports(prev =>
        prev.map(r =>
          r.id === reportId ? { ...r, status: newStatus } : r
        )
      );

      return { success: true };
    } catch (err) {
      console.error("Error updating report status:", err);
      return { success: false, error: err };
    }
  };

  const hideCheckin = async (checkinId: string) => {
    try {
      const { error } = await supabase
        .from("checkins")
        .update({ published: false })
        .eq("id", checkinId);

      if (error) throw error;

      // Update local state
      setReports(prev =>
        prev.map(r =>
          r.checkin_id === checkinId && r.checkin
            ? { ...r, checkin: { ...r.checkin, published: false } }
            : r
        )
      );

      return { success: true };
    } catch (err) {
      console.error("Error hiding checkin:", err);
      return { success: false, error: err };
    }
  };

  const getStatusCounts = useCallback(async () => {
    if (!hasAdminAccess) return { pending: 0, reviewed: 0, dismissed: 0, actioned: 0 };

    try {
      const { data, error } = await supabase
        .from("anonymous_reports")
        .select("status");

      if (error) throw error;

      const counts = {
        pending: 0,
        reviewed: 0,
        dismissed: 0,
        actioned: 0,
      };

      data?.forEach(r => {
        if (r.status && r.status in counts) {
          counts[r.status as keyof typeof counts]++;
        }
      });

      return counts;
    } catch {
      return { pending: 0, reviewed: 0, dismissed: 0, actioned: 0 };
    }
  }, [hasAdminAccess]);

  return {
    reports,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    refetch: fetchReports,
    updateReportStatus,
    hideCheckin,
    getStatusCounts,
  };
}
