import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_suspended: boolean;
  role: string;
  created_at: string;
}

export function useAdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_users_list");
      if (error) throw error;
      setUsers((data || []) as AdminUser[]);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserRole = async (targetUserId: string, newRole: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-user-role", {
        body: { target_user_id: targetUserId, new_role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await fetchUsers();
      toast({ title: "Permissão atualizada com sucesso." });
      return true;
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const updateUserSuspension = async (targetUserId: string, isSuspended: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-user-suspension", {
        body: { target_user_id: targetUserId, is_suspended: isSuspended },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await fetchUsers();
      toast({ title: isSuspended ? "Usuário suspenso." : "Acesso reativado." });
      return true;
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
  };

  return { users, isLoading, fetchUsers, updateUserRole, updateUserSuspension };
}
