import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { User, Mail, Bell, Lock, CreditCard, LogOut } from "lucide-react";

type PageState = "loading" | "success";

const Conta = () => {
  const [state] = useState<PageState>("success");

  const menuItems = [
    { icon: User, label: "Editar Perfil", onClick: () => {} },
    { icon: Mail, label: "Alterar Email", onClick: () => {} },
    { icon: Lock, label: "Alterar Senha", onClick: () => {} },
    { icon: Bell, label: "Notificações", onClick: () => {} },
    { icon: CreditCard, label: "Assinatura", onClick: () => {} },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-display font-semibold text-foreground">Minha Conta</h1>
        </header>

        {state === "loading" && <LoadingState message="Carregando perfil..." />}

        {state === "success" && (
          <>
            {/* Profile Card */}
            <Card variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-amethyst-light flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-foreground">
                      Usuário
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      usuario@email.com
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
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
