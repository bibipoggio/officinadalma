import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: LessonComment[];
}

export function useLessonComments(lessonId: string) {
  const { user, hasAdminAccess } = useAuth();
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = async () => {
    if (!lessonId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all comments for this lesson
      const { data: commentsData, error: commentsError } = await supabase
        .from("lesson_comments")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Fetch user profiles for all comment authors
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      
      const profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      
      for (const userId of userIds) {
        const { data: profileData } = await supabase
          .rpc("get_public_profile", { profile_id: userId });
        
        if (profileData && profileData.length > 0) {
          profiles[userId] = {
            display_name: profileData[0].display_name,
            avatar_url: profileData[0].avatar_url,
          };
        }
      }

      // Map comments with user data and organize into tree structure
      const commentsWithUsers = (commentsData || []).map(comment => ({
        ...comment,
        user: profiles[comment.user_id] || { display_name: null, avatar_url: null },
        replies: [] as LessonComment[],
      }));

      // Organize into parent-child structure
      const topLevelComments: LessonComment[] = [];
      const commentMap = new Map<string, LessonComment>();

      // First pass: create a map of all comments
      commentsWithUsers.forEach(comment => {
        commentMap.set(comment.id, comment);
      });

      // Second pass: organize into tree
      commentsWithUsers.forEach(comment => {
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
          const parent = commentMap.get(comment.parent_id)!;
          parent.replies = parent.replies || [];
          parent.replies.push(comment);
        } else if (!comment.parent_id) {
          topLevelComments.push(comment);
        }
      });

      setComments(topLevelComments);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Não foi possível carregar os comentários");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [lessonId]);

  const addComment = async (content: string, parentId: string | null = null) => {
    if (!user || !lessonId || !content.trim()) {
      return { success: false, error: "Dados inválidos" };
    }

    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("lesson_comments")
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          parent_id: parentId,
          content: content.trim(),
        });

      if (insertError) throw insertError;

      await fetchComments();
      return { success: true, error: null };
    } catch (err) {
      console.error("Error adding comment:", err);
      return { success: false, error: "Não foi possível adicionar o comentário" };
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return { success: false, error: "Não autenticado" };

    setIsSubmitting(true);
    try {
      const { error: deleteError } = await supabase
        .from("lesson_comments")
        .delete()
        .eq("id", commentId);

      if (deleteError) throw deleteError;

      await fetchComments();
      return { success: true, error: null };
    } catch (err) {
      console.error("Error deleting comment:", err);
      return { success: false, error: "Não foi possível excluir o comentário" };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    comments,
    isLoading,
    error,
    isSubmitting,
    addComment,
    deleteComment,
    refetch: fetchComments,
    canModerate: hasAdminAccess,
  };
}
