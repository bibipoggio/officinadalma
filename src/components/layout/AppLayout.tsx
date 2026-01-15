import * as React from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className={cn("pt-16 min-h-screen", className)}>
        <div className="container mx-auto px-4 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
