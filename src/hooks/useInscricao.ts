import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface InscricaoData {
  id: string;
  user_id: string;
  respostas: Record<string, unknown>;
  status: "pendente" | "aprovado" | "rejeitado";
  created_at: string;
  updated_at: string;
}

export function useInscricao() {
  const { user } = useAuth();
  const [inscricao, setInscricao] = useState<InscricaoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInscricao = async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("inscricoes")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && data) {
      setInscricao(data as unknown as InscricaoData);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchInscricao(); }, [user]);

  const saveInscricao = async (respostas: Record<string, unknown>) => {
    if (!user) throw new Error("Not authenticated");

    if (inscricao) {
      const { error } = await supabase
        .from("inscricoes")
        .update({ respostas: respostas as unknown as Record<string, never> })
        .eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("inscricoes")
        .insert({ user_id: user.id, respostas: respostas as unknown as Record<string, never> });
      if (error) throw error;
    }
    await fetchInscricao();
  };

  return {
    inscricao,
    isLoading,
    hasCompleted: !!inscricao,
    isApproved: inscricao?.status === "aprovado",
    isPending: inscricao?.status === "pendente",
    saveInscricao,
    refetch: fetchInscricao,
  };
}
