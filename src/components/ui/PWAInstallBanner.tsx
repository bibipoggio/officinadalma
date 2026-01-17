import * as React from "react";
import { Link } from "react-router-dom";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pwa-banner-dismissed";
const DISMISS_DURATION_DAYS = 7;

function isStandalone(): boolean {
  // Check if running as installed PWA
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isDismissed(): boolean {
  const dismissed = localStorage.getItem(STORAGE_KEY);
  if (!dismissed) return false;
  
  const dismissedDate = new Date(dismissed);
  const now = new Date();
  const diffDays = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return diffDays < DISMISS_DURATION_DAYS;
}

export function PWAInstallBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // Only show on mobile, not in standalone mode, and not dismissed
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const shouldShow = isMobile && !isStandalone() && !isDismissed();
    
    // Small delay for better UX
    const timer = setTimeout(() => {
      setVisible(shouldShow);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50",
        "animate-in slide-in-from-bottom-4 fade-in duration-500"
      )}
    >
      <Link
        to="/instalar"
        className={cn(
          "flex items-center gap-3 p-4 rounded-2xl",
          "bg-gradient-to-r from-primary to-primary/80",
          "shadow-lg shadow-primary/25",
          "border border-primary-foreground/10",
          "group transition-transform hover:scale-[1.02] active:scale-[0.98]"
        )}
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Download className="w-6 h-6 text-primary-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-primary-foreground">
            Instale o App
          </p>
          <p className="text-sm text-primary-foreground/80 truncate">
            Acesso rápido na sua tela inicial
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-2 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-primary-foreground/80" />
        </button>
      </Link>
    </div>
  );
}
