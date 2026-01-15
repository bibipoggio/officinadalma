import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";

// Pages
import Home from "./pages/Home";
import Tonica from "./pages/Tonica";
import Diario from "./pages/Diario";
import Comunidade from "./pages/Comunidade";
import Meditacao from "./pages/Meditacao";
import Aulas from "./pages/Aulas";
import Curso from "./pages/Curso";
import Aula from "./pages/Aula";
import Conta from "./pages/Conta";
import Assinar from "./pages/Assinar";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import AdminConteudoDiario from "./pages/AdminConteudoDiario";
import AdminCursos from "./pages/AdminCursos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth Routes (public only) */}
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/cadastro" element={<PublicOnlyRoute><Cadastro /></PublicOnlyRoute>} />

            {/* Protected Routes (requires login) */}
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/tonica/:date" element={<ProtectedRoute><Tonica /></ProtectedRoute>} />
            <Route path="/diario" element={<ProtectedRoute><Diario /></ProtectedRoute>} />
            <Route path="/comunidade" element={<ProtectedRoute><Comunidade /></ProtectedRoute>} />
            <Route path="/meditacao/:date" element={<ProtectedRoute><Meditacao /></ProtectedRoute>} />
            <Route path="/aulas" element={<ProtectedRoute><Aulas /></ProtectedRoute>} />
            <Route path="/aulas/:slug" element={<ProtectedRoute><Curso /></ProtectedRoute>} />
            <Route path="/aulas/:slug/aula/:lessonId" element={<ProtectedRoute><Aula /></ProtectedRoute>} />
            <Route path="/conta" element={<ProtectedRoute><Conta /></ProtectedRoute>} />
            <Route path="/assinar" element={<ProtectedRoute><Assinar /></ProtectedRoute>} />
            
            {/* Admin Routes (requires moderator or admin) */}
            <Route path="/admin/conteudo-diario" element={<ProtectedRoute requireAdmin><AdminConteudoDiario /></ProtectedRoute>} />
            <Route path="/admin/cursos" element={<ProtectedRoute requireAdmin><AdminCursos /></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
