 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 
 export type AnalyticsPeriod = "today" | "week" | "month" | "all";
 
interface EnhancedAnalyticsData {
  total_users: number;
  new_users: number;
  active_today: number;
  checkins_today: number;
  checkins_unique_users: number;
  meditation_plays: number;
  meditation_unique_users: number;
  enraizamento_plays: number;
  enraizamento_unique_users: number;
}
 
interface UserListItem {
  id: string;
  display_name: string | null;
  created_at: string;
  last_active: string | null;
  total_checkins: number;
  total_lesson_views: number;
  total_meditations_completed: number;
}
 
 interface NewUsersHistoryItem {
   date: string;
   new_users: number;
 }
 
 export function useEnhancedAnalytics(period: AnalyticsPeriod = "all") {
   const analyticsQuery = useQuery({
     queryKey: ["enhanced-analytics", period],
     queryFn: async (): Promise<EnhancedAnalyticsData> => {
       const { data, error } = await supabase.rpc("get_enhanced_analytics", {
         p_period: period,
       });
 
       if (error) {
         console.error("Error fetching enhanced analytics:", error);
         throw error;
       }
 
       return data as unknown as EnhancedAnalyticsData;
     },
     staleTime: 1000 * 60 * 5,
     retry: 1,
   });
 
   return {
     analytics: analyticsQuery.data,
     isLoading: analyticsQuery.isLoading,
     error: analyticsQuery.error,
     refetch: analyticsQuery.refetch,
   };
 }
 
 export function useUsersList() {
   return useQuery({
     queryKey: ["users-list"],
     queryFn: async (): Promise<UserListItem[]> => {
       const { data, error } = await supabase.rpc("get_users_list");
 
       if (error) {
         console.error("Error fetching users list:", error);
         throw error;
       }
 
       return (data as unknown as UserListItem[]) || [];
     },
     staleTime: 1000 * 60 * 5,
     retry: 1,
   });
 }
 
 export function useNewUsersHistory(days: number = 30) {
   return useQuery({
     queryKey: ["new-users-history", days],
     queryFn: async (): Promise<NewUsersHistoryItem[]> => {
       const { data, error } = await supabase.rpc("get_new_users_history", {
         p_days: days,
       });
 
       if (error) {
         console.error("Error fetching new users history:", error);
         throw error;
       }
 
       return (data as unknown as NewUsersHistoryItem[]) || [];
     },
     staleTime: 1000 * 60 * 5,
     retry: 1,
   });
 }
 
// Legacy tracking hook — now delegates to useMeditationAnalytics
export { useMeditationTracking } from "@/hooks/useMeditationAnalytics";