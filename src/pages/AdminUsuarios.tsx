import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/Modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { useAdminUsers, type AdminUser } from "@/hooks/useAdminUsers";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Shield, ShieldAlert, ShieldCheck, UserX, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type RoleFilter = "all" | "user" | "moderator" | "admin";
type StatusFilter = "all" | "active" | "suspended";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  moderator: "Moderador",
  user: "Usuário",
};

const roleBadgeColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  moderator: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  user: "bg-muted text-muted-foreground",
};

const AdminUsuarios = () => {
  const { user: currentUser } = useAuth();
  const { users, isLoading, updateUserRole, updateUserSuspension } = useAdminUsers();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    type: "role" | "suspend";
    user: AdminUser;
    newRole?: string;
    newSuspended?: boolean;
  } | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !search ||
        (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !u.is_suspended) ||
        (statusFilter === "suspended" && u.is_suspended);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setIsActioning(true);
    try {
      if (confirmAction.type === "role" && confirmAction.newRole) {
        await updateUserRole(confirmAction.user.id, confirmAction.newRole);
      } else if (confirmAction.type === "suspend" && confirmAction.newSuspended !== undefined) {
        await updateUserSuspension(confirmAction.user.id, confirmAction.newSuspended);
      }
    } finally {
      setIsActioning(false);
      setConfirmAction(null);
    }
  };

  const getConfirmTitle = () => {
    if (!confirmAction) return "";
    if (confirmAction.type === "role") {
      return `Alterar permissão para ${roleLabels[confirmAction.newRole!]}?`;
    }
    return confirmAction.newSuspended ? "Suspender acesso?" : "Reativar acesso?";
  };

  const getConfirmDescription = () => {
    if (!confirmAction) return "";
    const name = confirmAction.user.display_name || confirmAction.user.email || "este usuário";
    if (confirmAction.type === "role") {
      if (confirmAction.newRole === "moderator") {
        return `${name} poderá moderar conteúdo, gerenciar aulas e eventos.`;
      }
      if (confirmAction.newRole === "user") {
        return `${name} perderá acesso às funcionalidades de moderação.`;
      }
      return `${name} terá o papel de ${roleLabels[confirmAction.newRole!]}.`;
    }
    if (confirmAction.newSuspended) {
      return `${name} não conseguirá acessar o app até que o acesso seja reativado.`;
    }
    return `${name} poderá acessar o app normalmente.`;
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <h1 className="text-xl font-bold mb-4">Gestão de Usuários</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            {(["all", "user", "moderator", "admin"] as RoleFilter[]).map((r) => (
              <Button
                key={r}
                variant={roleFilter === r ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setRoleFilter(r)}
              >
                {r === "all" ? "Todos" : roleLabels[r]}
              </Button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["all", "active", "suspended"] as StatusFilter[]).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "Status" : s === "active" ? "Ativo" : "Suspenso"}
              </Button>
            ))}
          </div>
        </div>

        {/* Users list */}
        {isLoading ? (
          <LoadingState message="Carregando usuários..." />
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{filteredUsers.length} usuário(s)</p>
            {filteredUsers.map((u) => {
              const isSelf = currentUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`bg-card border rounded-xl p-3 sm:p-4 ${u.is_suspended ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {u.display_name || "Sem nome"}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${roleBadgeColors[u.role] || roleBadgeColors.user}`}>
                          {roleLabels[u.role] || u.role}
                        </span>
                        {u.is_suspended && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/20 text-destructive">
                            Suspenso
                          </span>
                        )}
                        {isSelf && (
                          <span className="text-[10px] text-muted-foreground">(você)</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Cadastro: {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                    {u.role === "user" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 gap-1"
                        onClick={() => setConfirmAction({ type: "role", user: u, newRole: "moderator" })}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Tornar moderador
                      </Button>
                    )}
                    {u.role === "moderator" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 gap-1"
                        onClick={() => setConfirmAction({ type: "role", user: u, newRole: "user" })}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Revogar moderador
                      </Button>
                    )}
                    {!isSelf && (
                      u.is_suspended ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 gap-1"
                          onClick={() => setConfirmAction({ type: "suspend", user: u, newSuspended: false })}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Reativar acesso
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 gap-1 text-destructive hover:text-destructive"
                          onClick={() => setConfirmAction({ type: "suspend", user: u, newSuspended: true })}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Suspender
                        </Button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={getConfirmTitle()}
        description={getConfirmDescription()}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmAction}
        loading={isActioning}
      />
    </AppLayout>
  );
};

export default AdminUsuarios;
