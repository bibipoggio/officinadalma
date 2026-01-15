import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/tonica/:date" element={<Tonica />} />
          <Route path="/diario" element={<Diario />} />
          <Route path="/comunidade" element={<Comunidade />} />
          <Route path="/meditacao/:date" element={<Meditacao />} />
          <Route path="/aulas" element={<Aulas />} />
          <Route path="/aulas/:slug" element={<Curso />} />
          <Route path="/aulas/:slug/aula/:lessonId" element={<Aula />} />
          <Route path="/conta" element={<Conta />} />
          <Route path="/assinar" element={<Assinar />} />
          
          {/* Admin Routes */}
          <Route path="/admin/conteudo-diario" element={<AdminConteudoDiario />} />
          <Route path="/admin/cursos" element={<AdminCursos />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
