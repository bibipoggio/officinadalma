import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, CreditCard, LogOut, Shield } from "lucide-react";

const Conta = () => {
  const { user, profile, role, isLoading, signOut, hasAdminAccess } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: User, label: "Editar Perfil", onClick: () => navigate("/conta/editar") },
    { icon: Mail, label: "Alterar Email", onClick: () => {} },
    { icon: Lock, label: "Alterar Senha", onClick: () => navigate("/conta/alterar-senha") },
    { icon: CreditCard, label: "Assinatura", onClick: () => navigate("/assinar") },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const getRoleLabel = () => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "moderator":
        return "Moderador";
      default:
        return "Usuário";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-display font-semibold text-foreground">Minha Conta</h1>
        </header>

        {isLoading && <LoadingState message="Carregando perfil..." />}

        {!isLoading && (
          <>
            {/* Profile Card */}
            <Card variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-amethyst-light flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display font-semibold text-foreground">
                      {profile?.display_name || "Usuário"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                    {hasAdminAccess && (
                      <div className="flex items-center gap-1 mt-1">
                        <Shield className="w-3 h-3 text-primary" />
                        <span className="text-xs text-primary font-medium">
                          {getRoleLabel()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Access Link */}
            {hasAdminAccess && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <button
                    onClick={() => navigate("/admin/conteudo-diario")}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Painel Administrativo</span>
                      <p className="text-sm text-muted-foreground">
                        Gerenciar conteúdo e cursos
                      </p>
                    </div>
                  </button>
                </CardContent>
              </Card>
            )}

            {/* Notification Settings */}
            <NotificationSettings />

            {/* Menu */}
            <Card>
              <CardContent className="p-2">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-foreground">{item.label}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Logout */}
            <Button 
              variant="ghost" 
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sair da Conta
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Conta;
