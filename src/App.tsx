import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/hooks/use-network-status";
import Index from "./pages/Index";
import Favorites from "./pages/Favorites";
import Catalog from "./pages/Catalog";
import Profile from "./pages/Profile";
import AnimeDetails from "./pages/AnimeDetails";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import { API_URL } from '@/services/backendApi';

const queryClient = new QueryClient();

function App() {
  // Инициализируем сетевой статус
  useNetworkStatus(API_URL);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased transition-colors duration-300">
      <QueryClientProvider client={queryClient}>
  <HashRouter>
          <TooltipProvider>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/anime/:id" element={<AnimeDetails />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner />
            </AuthProvider>
          </TooltipProvider>
  </HashRouter>
      </QueryClientProvider>
    </div>
  );
}

export default App;
