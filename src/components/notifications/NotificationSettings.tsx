import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

export function NotificationSettings() {
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const success = await subscribe();
      if (success) {
        toast({
          title: "Notificações ativadas!",
          description: "Você será notificado quando novas aulas forem publicadas.",
        });
      } else if (permission === "denied") {
        toast({
          title: "Permissão negada",
          description: "Por favor, habilite as notificações nas configurações do navegador.",
          variant: "destructive",
        });
      }
    } else {
      await unsubscribe();
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais notificações de novas aulas.",
      });
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <BellOff className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">Notificações Push</h3>
            <p className="text-sm text-muted-foreground">
              Seu navegador não suporta notificações push.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isSubscribed ? "bg-primary/10" : "bg-muted"
        }`}>
          {isSubscribed ? (
            <BellRing className="w-5 h-5 text-primary" />
          ) : (
            <Bell className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-foreground">Notificações Push</h3>
          <p className="text-sm text-muted-foreground">
            {isSubscribed
              ? "Receba alertas de novas aulas"
              : "Ative para saber quando novas aulas são publicadas"}
          </p>
        </div>
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={isLoading}
          aria-label="Ativar notificações push"
        />
      </CardContent>
    </Card>
  );
}

export function NotificationToggleButton() {
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) return null;

  const handleClick = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast({
        title: "Notificações desativadas",
      });
    } else {
      const success = await subscribe();
      if (success) {
        toast({
          title: "Notificações ativadas!",
          description: "Você será notificado quando novas aulas forem publicadas.",
        });
      } else if (permission === "denied") {
        toast({
          title: "Permissão negada",
          description: "Habilite nas configurações do navegador.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <BellRing className="w-4 h-4" />
          Notificações On
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          Ativar Notificações
        </>
      )}
    </Button>
  );
}
