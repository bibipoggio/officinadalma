import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ForumTopic {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  report_count: number;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  reply_count: number;
}

export interface ForumReply {
  id: string;
  topic_id: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  report_count: number;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const TOPICS_PER_PAGE = 10;

export function useForumTopics(page: number = 1) {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTopics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from("forum_topics")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false);

      if (countError) throw countError;

      setTotalPages(Math.ceil((count || 0) / TOPICS_PER_PAGE));

      // Get topics for current page
      const offset = (page - 1) * TOPICS_PER_PAGE;
      const { data: topicsData, error: topicsError } = await supabase
        .from("forum_topics")
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(offset, offset + TOPICS_PER_PAGE - 1);

      if (topicsError) throw topicsError;

      if (!topicsData || topicsData.length === 0) {
        setTopics([]);
        return;
      }

      // Get author profiles
      const authorIds = [...new Set(topicsData.map(t => t.author_id))];
      const profilesMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};

      for (const authorId of authorIds) {
        const { data: profileData } = await supabase.rpc("get_public_profile", {
          profile_id: authorId,
        });
        if (profileData && profileData.length > 0) {
          profilesMap[authorId] = {
            display_name: profileData[0].display_name,
            avatar_url: profileData[0].avatar_url,
          };
        }
      }

      // Get reply counts
      const topicIds = topicsData.map(t => t.id);
      const { data: replyCounts } = await supabase
        .from("forum_replies")
        .select("topic_id")
        .in("topic_id", topicIds)
        .eq("is_deleted", false);

      const replyCountMap: Record<string, number> = {};
      replyCounts?.forEach(r => {
        replyCountMap[r.topic_id] = (replyCountMap[r.topic_id] || 0) + 1;
      });

      // Combine data
      const enrichedTopics: ForumTopic[] = topicsData.map(topic => ({
        ...topic,
        author: profilesMap[topic.author_id] || null,
        reply_count: replyCountMap[topic.id] || 0,
      }));

      setTopics(enrichedTopics);
    } catch (err) {
      console.error("Error fetching topics:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return {
    topics,
    totalPages,
    isLoading,
    error,
    refetch: fetchTopics,
  };
}

export function useForumTopic(topicId: string | undefined) {
  const { user, hasAdminAccess } = useAuth();
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTopic = useCallback(async () => {
    if (!topicId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch topic
      const { data: topicData, error: topicError } = await supabase
        .from("forum_topics")
        .select("*")
        .eq("id", topicId)
        .maybeSingle();

      if (topicError) throw topicError;
      if (!topicData) {
        setError(new Error("Tópico não encontrado"));
        return;
      }

      // Fetch author profile
      const { data: authorProfile } = await supabase.rpc("get_public_profile", {
        profile_id: topicData.author_id,
      });

      const enrichedTopic: ForumTopic = {
        ...topicData,
        author: authorProfile?.[0] || null,
        reply_count: 0,
      };

      setTopic(enrichedTopic);

      // Fetch replies
      const { data: repliesData, error: repliesError } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("topic_id", topicId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (repliesError) throw repliesError;

      if (repliesData && repliesData.length > 0) {
        // Get author profiles for replies
        const replyAuthorIds = [...new Set(repliesData.map(r => r.author_id))];
        const profilesMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};

        for (const authorId of replyAuthorIds) {
          const { data: profileData } = await supabase.rpc("get_public_profile", {
            profile_id: authorId,
          });
          if (profileData && profileData.length > 0) {
            profilesMap[authorId] = {
              display_name: profileData[0].display_name,
              avatar_url: profileData[0].avatar_url,
            };
          }
        }

        const enrichedReplies: ForumReply[] = repliesData.map(reply => ({
          ...reply,
          author: profilesMap[reply.author_id] || null,
        }));

        setReplies(enrichedReplies);
        enrichedTopic.reply_count = enrichedReplies.length;
        setTopic(enrichedTopic);
      } else {
        setReplies([]);
      }
    } catch (err) {
      console.error("Error fetching topic:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  const addReply = async (content: string) => {
    if (!user || !topicId) return { success: false, error: "Usuário não autenticado" };

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("forum_replies").insert({
        topic_id: topicId,
        content,
        author_id: user.id,
      });

      if (error) throw error;

      await fetchTopic();
      return { success: true, error: null };
    } catch (err) {
      console.error("Error adding reply:", err);
      return { success: false, error: (err as Error).message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const softDeleteTopic = async () => {
    if (!hasAdminAccess || !topicId || !user) return { success: false };

    try {
      const { error } = await supabase
        .from("forum_topics")
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", topicId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error deleting topic:", err);
      return { success: false };
    }
  };

  const softDeleteReply = async (replyId: string) => {
    if (!hasAdminAccess || !user) return { success: false };

    try {
      const { error } = await supabase
        .from("forum_replies")
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", replyId);

      if (error) throw error;
      await fetchTopic();
      return { success: true };
    } catch (err) {
      console.error("Error deleting reply:", err);
      return { success: false };
    }
  };

  return {
    topic,
    replies,
    isLoading,
    error,
    isSubmitting,
    addReply,
    softDeleteTopic,
    softDeleteReply,
    refetch: fetchTopic,
    canModerate: hasAdminAccess,
  };
}

export function useCreateTopic() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTopic = async (title: string, content: string) => {
    if (!user) return { success: false, error: "Usuário não autenticado", topicId: null };

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("forum_topics")
        .insert({
          title,
          content,
          author_id: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      return { success: true, error: null, topicId: data.id };
    } catch (err) {
      console.error("Error creating topic:", err);
      return { success: false, error: (err as Error).message, topicId: null };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { createTopic, isSubmitting };
}

export function useForumReport() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportContent = async (
    type: "topic" | "reply",
    id: string,
    reason: string
  ) => {
    if (!user) return { success: false, error: "Usuário não autenticado" };

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("forum_reports").insert({
        reporter_id: user.id,
        topic_id: type === "topic" ? id : null,
        reply_id: type === "reply" ? id : null,
        reason,
      });

      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      console.error("Error reporting content:", err);
      return { success: false, error: (err as Error).message };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { reportContent, isSubmitting };
}
