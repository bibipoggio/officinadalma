import * as React from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import loginBg from "@/assets/login-bg.jpg";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [scrollY, setScrollY] = React.useState(0);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reduced parallax on mobile for better performance (10% vs 30%)
  const parallaxFactor = isMobile ? 0.1 : 0.3;
  const parallaxOffset = scrollY * parallaxFactor;

  return (
    <div className="min-h-screen relative">
      {/* Background with image and parallax effect */}
      <div 
        className="fixed inset-0 z-0 transition-transform duration-100 ease-out will-change-transform"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          transform: `translateY(${parallaxOffset}px) scale(1.1)`,
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
