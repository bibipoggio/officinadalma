import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Shield, Users, Eye, AlertTriangle } from "lucide-react";

const PRIVACY_ACCEPTED_KEY = "community_privacy_accepted";

interface PrivacyDisclaimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  onCancel: () => void;
  shareMode: "community" | "anonymous";
}

export function PrivacyDisclaimerModal({
  open,
  onOpenChange,
  onAccept,
  onCancel,
  shareMode,
}: PrivacyDisclaimerModalProps) {
  const [understood, setUnderstood] = useState(false);

  // Reset checkbox when modal opens
  useEffect(() => {
    if (open) {
      setUnderstood(false);
    }
  }, [open]);

  const handleAccept = () => {
    localStorage.setItem(PRIVACY_ACCEPTED_KEY, "true");
    onAccept();
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Aviso de Privacidade"
      description="Leia com atenção antes de compartilhar"
      size="default"
      footer={
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!understood}
            className="flex-1"
          >
            Aceitar e Continuar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Warning header */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Atenção: Dados Sensíveis Serão Públicos
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Seu estado emocional, nível de energia e reflexões pessoais serão visíveis para <strong>todos os usuários</strong> da comunidade.
            </p>
          </div>
        </div>

        {/* Checkbox confirmation - moved up for better UX */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={understood}
              onCheckedChange={(checked) => setUnderstood(checked === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              Entendo que meu conteúdo será visível para outros usuários da comunidade e 
              concordo em compartilhar.
            </span>
          </label>
        </div>

        {/* Info sections */}
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {shareMode === "community" ? "Modo Comunidade" : "Modo Anônimo"}
              </p>
              <p className="text-muted-foreground mt-0.5">
                {shareMode === "community"
                  ? "Seu nome de exibição será mostrado junto ao seu check-in."
                  : "Seu check-in será exibido sem seu nome."}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-foreground">O que será visível</p>
              <p className="text-muted-foreground mt-0.5">
                Energia, texto pessoal{shareMode === "community" ? " e seu nome" : ""}.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Seus Direitos</p>
              <p className="text-muted-foreground mt-0.5">
                Você pode despublicar a qualquer momento pelo Diário.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Helper function to check if disclaimer was already accepted
export function hasAcceptedPrivacyDisclaimer(): boolean {
  return localStorage.getItem(PRIVACY_ACCEPTED_KEY) === "true";
}

// Helper function to reset the privacy acceptance (for testing or settings)
export function resetPrivacyDisclaimer(): void {
  localStorage.removeItem(PRIVACY_ACCEPTED_KEY);
}
