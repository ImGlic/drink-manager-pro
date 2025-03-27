
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Index from "./pages/Index";
import Estoque from "./pages/Estoque";
import Vendas from "./pages/Vendas";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route 
                path="/" 
                element={
                  <ProtectedRoute requiredPermission="dashboard">
                    <Index />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/estoque" 
                element={
                  <ProtectedRoute requiredPermission="estoque">
                    <Estoque />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/vendas" 
                element={
                  <ProtectedRoute requiredPermission="vendas">
                    <Vendas />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/configuracoes" 
                element={
                  <ProtectedRoute requiredPermission="configuracoes">
                    <Configuracoes />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
