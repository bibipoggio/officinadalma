import * as React from "react";
import { Instagram, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const STORAGE_KEY = "community-invite-shown";
const INSTAGRAM_URL = "https://www.instagram.com/officinadalma/";
const WHATSAPP_URL = "https://chat.whatsapp.com/JbZYUXvrcMkLQjql8RvmrE?mode=gi_t";

export function useCommunityInvite() {
  const [open, setOpen] = React.useState(false);

  const triggerInvite = React.useCallback(() => {
    const alreadyShown = localStorage.getItem(STORAGE_KEY);
    if (!alreadyShown) {
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
  }, []);

  return { open, setOpen, triggerInvite };
}

interface CommunityInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommunityInviteModal({ open, onOpenChange }: CommunityInviteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="font-display text-xl">
            Quer ficar mais perto da comunidade?
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Conecte-se com a Officina da Alma nas redes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full text-base gap-3"
            asChild
          >
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-5 h-5" />
              Entrar no WhatsApp
            </a>
          </Button>

          <Button
            variant="ethereal"
            size="lg"
            className="w-full text-base gap-3"
            asChild
          >
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram className="w-5 h-5" />
              Seguir no Instagram
            </a>
          </Button>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="mt-2 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Agora não
        </button>
      </DialogContent>
    </Dialog>
  );
}
