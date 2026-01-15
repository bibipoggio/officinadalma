import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface DailyContentData {
  id?: string;
  date: string;
  tonica_title: string;
  tonica_short: string;
  tonica_full: string;
  tonica_practice: string;
  meditation_audio_url: string | null;
  meditation_duration_seconds: number | null;
  spotify_episode_url: string | null;
  published: boolean;
  created_by?: string | null;
}

const emptyContent = (date: string): DailyContentData => ({
  date,
  tonica_title: "",
  tonica_short: "",
  tonica_full: "",
  tonica_practice: "",
  meditation_audio_url: null,
  meditation_duration_seconds: null,
  spotify_episode_url: null,
  published: false,
});

export function useDailyContent(selectedDate: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState<DailyContentData>(emptyContent(selectedDate));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewContent, setIsNewContent] = useState(true);

  const fetchContent = useCallback(async () => {
    if (!selectedDate) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_content")
        .select("*")
        .eq("date", selectedDate)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setContent(data);
        setIsNewContent(false);
      } else {
        setContent(emptyContent(selectedDate));
        setIsNewContent(true);
      }
    } catch (error) {
      console.error("Error fetching daily content:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o conteúdo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const updateField = <K extends keyof DailyContentData>(
    field: K,
    value: DailyContentData[K]
  ) => {
    setContent((prev) => ({ ...prev, [field]: value }));
  };

  const saveContent = async (publish: boolean) => {
    // Validation
    const missingFields: string[] = [];
    if (!content.tonica_title.trim()) missingFields.push("Título da Tônica");
    if (!content.tonica_short.trim()) missingFields.push("Resumo curto");
    if (!content.tonica_full.trim()) missingFields.push("Texto completo");
    if (!content.tonica_practice.trim()) missingFields.push("Prática do dia");

    if (missingFields.length > 0) {
      toast({
        title: "Falta preencher",
        description: missingFields.join(", "),
        variant: "destructive",
      });
      return false;
    }

    // URL validation
    if (content.meditation_audio_url && !isValidUrl(content.meditation_audio_url)) {
      toast({
        title: "Link inválido",
        description: "O link do áudio não é válido.",
        variant: "destructive",
      });
      return false;
    }

    if (content.spotify_episode_url && !isValidUrl(content.spotify_episode_url)) {
      toast({
        title: "Link inválido",
        description: "O link do Spotify não é válido.",
        variant: "destructive",
      });
      return false;
    }

    setIsSaving(true);
    try {
      const payload = {
        date: selectedDate,
        tonica_title: content.tonica_title.trim(),
        tonica_short: content.tonica_short.trim(),
        tonica_full: content.tonica_full.trim(),
        tonica_practice: content.tonica_practice.trim(),
        meditation_audio_url: content.meditation_audio_url?.trim() || null,
        meditation_duration_seconds: content.meditation_duration_seconds,
        spotify_episode_url: content.spotify_episode_url?.trim() || null,
        published: publish,
        created_by: user?.id || null,
      };

      let error;
      if (isNewContent) {
        const result = await supabase.from("daily_content").insert(payload);
        error = result.error;
      } else {
        const result = await supabase
          .from("daily_content")
          .update(payload)
          .eq("id", content.id);
        error = result.error;
      }

      if (error) throw error;

      setContent((prev) => ({ ...prev, published: publish }));
      if (isNewContent) setIsNewContent(false);

      toast({
        title: publish ? "Conteúdo publicado." : "Conteúdo salvo.",
        description: publish 
          ? "O conteúdo está disponível para os usuários." 
          : "O rascunho foi salvo.",
      });

      // Refresh to get the ID if it was a new insert
      if (isNewContent) {
        await fetchContent();
      }

      return true;
    } catch (error) {
      console.error("Error saving daily content:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const unpublish = async () => {
    if (isNewContent || !content.id) return false;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("daily_content")
        .update({ published: false })
        .eq("id", content.id);

      if (error) throw error;

      setContent((prev) => ({ ...prev, published: false }));
      toast({
        title: "Conteúdo despublicado.",
        description: "O conteúdo não está mais visível para os usuários.",
      });
      return true;
    } catch (error) {
      console.error("Error unpublishing:", error);
      toast({
        title: "Erro",
        description: "Não foi possível despublicar. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    content,
    isLoading,
    isSaving,
    isNewContent,
    updateField,
    saveContent,
    unpublish,
  };
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}
