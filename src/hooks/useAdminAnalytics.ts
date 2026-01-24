import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsData {
  total_users: number;
  active_today: number;
  active_month: number;
  new_users_today: number;
  new_users_month: number;
  forum_topics: number;
  forum_replies: number;
  diary_entries_today: number;
  diary_entries_month: number;
}

interface DailyAccessData {
  access_date: string;
  active_users: number;
  new_users: number;
}

export function useAdminAnalytics() {
  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async (): Promise<AnalyticsData> => {
      const { data, error } = await supabase.rpc("get_admin_analytics");
      
      if (error) {
        console.error("Error fetching analytics:", error);
        throw error;
      }
      
      // Cast through unknown to satisfy TypeScript
      return data as unknown as AnalyticsData;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
  });

  const historyQuery = useQuery({
    queryKey: ["admin-analytics-history"],
    queryFn: async (): Promise<DailyAccessData[]> => {
      const { data, error } = await supabase.rpc("get_daily_access_history", {
        days_back: 30,
      });
      
      if (error) {
        console.error("Error fetching access history:", error);
        throw error;
      }
      
      return (data as unknown as DailyAccessData[]) || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
  });

  return {
    analytics: analyticsQuery.data,
    history: historyQuery.data || [],
    isLoading: analyticsQuery.isLoading || historyQuery.isLoading,
    error: analyticsQuery.error || historyQuery.error,
    refetch: () => {
      analyticsQuery.refetch();
      historyQuery.refetch();
    },
  };
}

// Hook para registrar sessão do usuário
export function useSessionTracking() {
  const trackSession = async (userId: string, deviceType?: string) => {
    try {
      const { error } = await supabase
        .from("user_sessions")
        .insert({
          user_id: userId,
          device_type: deviceType || detectDeviceType(),
        });
      
      if (error) {
        console.error("Error tracking session:", error);
      }
    } catch (err) {
      console.error("Session tracking error:", err);
    }
  };

  return { trackSession };
}

function detectDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return "mobile";
  }
  return "web";
}
