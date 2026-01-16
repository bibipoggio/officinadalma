import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingState } from "@/components/layout/PageState";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

// Check if profile is complete (has required fields)
function isProfileComplete(profile: { 
  birth_date?: string | null; 
  birth_city?: string | null;
  phone?: string | null;
} | null): boolean {
  if (!profile) return false;
  return !!(profile.birth_date && profile.birth_city && profile.phone);
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasAdminAccess, profile } = useAuth();
  const location = useLocation();

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <AppLayout>
        <LoadingState message="Verificando autenticação..." />
      </AppLayout>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to complete profile if profile is incomplete
  // Skip this check if already on the complete profile page
  if (location.pathname !== "/completar-perfil" && !isProfileComplete(profile)) {
    return <Navigate to="/completar-perfil" replace />;
  }

  // Check admin access for admin routes
  if (requireAdmin && !hasAdminAccess) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldX className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                Acesso Restrito
              </h2>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar esta área. 
                Esta página é restrita a moderadores e administradores.
              </p>
              <Button onClick={() => window.location.href = "/"} className="w-full">
                Voltar para Início
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingState message="Carregando..." />
      </div>
    );
  }

  // Redirect authenticated users to home or previous page
  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}
