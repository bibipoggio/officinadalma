import * as React from "react";
import { Menu, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  onMenuClick: () => void;
  className?: string;
}

export function AppHeader({ onMenuClick, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 h-16 bg-background/95 backdrop-blur-sm border-b border-border",
        className
      )}
    >
      <div className="flex items-center justify-between h-full px-4 max-w-screen-xl mx-auto">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold text-foreground hidden sm:inline">
            Officina da Alma
          </span>
        </a>

        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6 text-foreground" />
        </button>
      </div>
    </header>
  );
}
