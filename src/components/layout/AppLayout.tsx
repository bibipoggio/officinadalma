import * as React from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";
import loginBg from "@/assets/login-bg.jpg";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen relative">
      {/* Background with image */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Overlay for better contrast */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-background/40 via-background/50 to-background/70" />
      
      <div className="relative z-10">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={cn("pt-16 min-h-screen", className)}>
          <div className="container mx-auto px-4 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
