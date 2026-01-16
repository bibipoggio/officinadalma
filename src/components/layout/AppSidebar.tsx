import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  X,
  Home,
  Users,
  BookOpen,
  Headphones,
  GraduationCap,
  User,
  CreditCard,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/tonica/hoje", label: "Tônica do Dia", icon: Headphones },
  { href: "/diario", label: "Meu Diário", icon: BookOpen },
  { href: "/comunidade", label: "Comunidade", icon: Users },
  { href: "/aulas", label: "Aulas", icon: GraduationCap },
  { href: "/conta", label: "Minha Conta", icon: User },
  { href: "/assinar", label: "Assinar", icon: CreditCard },
];

const adminItems = [
  { href: "/admin/conteudo-diario", label: "Conteúdo Diário", icon: LayoutDashboard },
  { href: "/admin/cursos", label: "Cursos", icon: Settings },
];

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const location = useLocation();
  const { hasAdminAccess } = useAuth();

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-sidebar border-l border-sidebar-border shadow-elevated animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <span className="font-display text-lg font-semibold text-sidebar-foreground">
              Menu
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5 text-sidebar-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Admin Section */}
            {hasAdminAccess && (
              <>
                <div className="my-4 border-t border-sidebar-border" />
                <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Admin
                </p>
                <ul className="space-y-1">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
