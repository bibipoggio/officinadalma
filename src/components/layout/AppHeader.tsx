import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import logoOfficina from "@/assets/logo_officina.jpg";

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
          <div className="w-10 h-10 rounded-lg overflow-hidden group-hover:shadow-glow transition-shadow duration-300">
            <img 
              src={logoOfficina} 
              alt="Officina da Alma" 
              className="w-full h-full object-cover"
            />
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
