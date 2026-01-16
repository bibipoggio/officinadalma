import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";

export interface CommunityCheckin {
  id: string;
  user_id: string;
  date: string;
  energy: number;
  feeling_text: string;
  share_mode: "community" | "anonymous";
  created_at: string;
  display_name: string | null;
  reactions: ReactionCount[];
  userReactions: string[]; // emojis the current user has reacted with
}

export interface ReactionCount {
  emoji: string;
  count: number;
}

export const REACTION_EMOJIS = ["🙏", "✨", "💜", "🌙", "🔥", "🌿"];

export function useCommunityFeed() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<CommunityCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date();
      const sixDaysAgo = subDays(today, 6);
      const minDate = format(sixDaysAgo, "yyyy-MM-dd");

      // Fetch checkins with profiles
      const { data: checkinsData, error: checkinsError } = await supabase
        .from("checkins")
        .select(`
          id,
          user_id,
          date,
          energy,
          feeling_text,
          share_mode,
          created_at
        `)
        .eq("published", true)
        .in("share_mode", ["community", "anonymous"])
        .gte("date", minDate)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (checkinsError) throw checkinsError;

      if (!checkinsData || checkinsData.length === 0) {
        setCheckins([]);
        return;
      }

      // Get user IDs for community checkins to fetch display names
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

      // Fetch reactions for all checkins
      const checkinIds = checkinsData.map(c => c.id);
      const { data: reactionsData } = await supabase
        .from("checkin_reactions")
        .select("checkin_id, emoji, user_id")
        .in("checkin_id", checkinIds);

      // Process reactions
      const reactionsMap: Record<string, { counts: Record<string, number>; userReacted: string[] }> = {};
      checkinIds.forEach(id => {
        reactionsMap[id] = { counts: {}, userReacted: [] };
      });

      if (reactionsData) {
        reactionsData.forEach(r => {
          if (!reactionsMap[r.checkin_id].counts[r.emoji]) {
            reactionsMap[r.checkin_id].counts[r.emoji] = 0;
          }
          reactionsMap[r.checkin_id].counts[r.emoji]++;
          
          if (user && r.user_id === user.id) {
            reactionsMap[r.checkin_id].userReacted.push(r.emoji);
          }
        });
      }

      // Build final checkins array
      const processedCheckins: CommunityCheckin[] = checkinsData.map(c => ({
        id: c.id,
        user_id: c.user_id,
        date: c.date,
        energy: c.energy,
        feeling_text: c.feeling_text,
        share_mode: c.share_mode as "community" | "anonymous",
        created_at: c.created_at,
        display_name: c.share_mode === "community" ? profilesMap[c.user_id] || null : null,
        reactions: Object.entries(reactionsMap[c.id].counts).map(([emoji, count]) => ({
          emoji,
          count,
        })),
        userReactions: reactionsMap[c.id].userReacted,
      }));

      setCheckins(processedCheckins);
    } catch (err) {
      console.error("Error fetching community feed:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const toggleReaction = async (checkinId: string, emoji: string) => {
    if (!user) return;

    const checkin = checkins.find(c => c.id === checkinId);
    if (!checkin) return;

    const hasReacted = checkin.userReactions.includes(emoji);

    // Optimistic update
    setCheckins(prev => prev.map(c => {
      if (c.id !== checkinId) return c;

      let newUserReactions = [...c.userReactions];
      let newReactions = [...c.reactions];

      if (hasReacted) {
        // Remove reaction
        newUserReactions = newUserReactions.filter(e => e !== emoji);
        newReactions = newReactions.map(r => 
          r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1) } : r
        ).filter(r => r.count > 0);
      } else {
        // Add reaction
        newUserReactions.push(emoji);
        const existing = newReactions.find(r => r.emoji === emoji);
        if (existing) {
          newReactions = newReactions.map(r =>
            r.emoji === emoji ? { ...r, count: r.count + 1 } : r
          );
        } else {
          newReactions.push({ emoji, count: 1 });
        }
      }

      return { ...c, userReactions: newUserReactions, reactions: newReactions };
    }));

    try {
      if (hasReacted) {
        // Delete reaction
        await supabase
          .from("checkin_reactions")
          .delete()
          .eq("checkin_id", checkinId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
      } else {
        // Insert reaction
        await supabase
          .from("checkin_reactions")
          .insert({
            checkin_id: checkinId,
            user_id: user.id,
            emoji,
          });
      }
    } catch (err) {
      console.error("Error toggling reaction:", err);
      // Revert on error
      await fetchFeed();
    }
  };

  const reportCheckin = async (checkinId: string, reason: string) => {
    if (!user) return { success: false };

    try {
      const { error } = await supabase
        .from("reports")
        .insert({
          checkin_id: checkinId,
          reporter_user_id: user.id,
          reason,
        });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error reporting checkin:", err);
      return { success: false };
    }
  };

  return {
    checkins,
    isLoading,
    error,
    refetch: fetchFeed,
    toggleReaction,
    reportCheckin,
  };
}
