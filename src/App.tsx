import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AvatarProvider } from "@/hooks/useAvatar";
import { ThemeProvider } from "@/hooks/useTheme";
import { PWAUpdateProvider } from "@/hooks/usePWAUpdate";
import { usePageTracking } from "@/hooks/usePageTracking";
import UpdateAvailableBanner from "@/components/UpdateAvailableBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SavedAvatars from "./pages/SavedAvatars";
import SavedOutfits from "./pages/SavedOutfits";
import Wardrobe from "./pages/Wardrobe";
import TryOnStudio from "./pages/TryOnStudio";

import BrandTryOn from "./pages/BrandTryOn";
import LocalBrands from "./pages/LocalBrands";
import BrandStore from "./pages/BrandStore";
import Chat from "./pages/Chat";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Terms from "./pages/Terms";
import ScanTryOn from "./pages/ScanTryOn";
import Unsubscribe from "./pages/Unsubscribe";
import Referrals from "./pages/Referrals";
import Admin from "./pages/Admin";
import AdminOrders from "./pages/AdminOrders";
import PublicBrandStore from "./pages/PublicBrandStore";
import SupportChatWidget from "./components/SupportChatWidget";

const queryClient = new QueryClient();

const PageTracker = () => {
  usePageTracking();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <PWAUpdateProvider>
    <AuthProvider>
      <AvatarProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PageTracker />
            <UpdateAvailableBanner />
            <Routes>
              <Route path="/" element={<TryOnStudio />} />
              <Route path="/index" element={<TryOnStudio />} />
              <Route path="/home" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/saved-avatars" element={<SavedAvatars />} />
              <Route path="/saved-outfits" element={<SavedOutfits />} />
              <Route path="/wardrobe" element={<Wardrobe />} />
              
              <Route path="/scan" element={<ScanTryOn />} />
              <Route path="/brands" element={<BrandTryOn />} />
              <Route path="/local-brands" element={<LocalBrands />} />
              <Route path="/local-brands/:slug" element={<BrandStore />} />
              <Route path="/store/:slug" element={<PublicBrandStore />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SupportChatWidget />
          </BrowserRouter>
        </TooltipProvider>
      </AvatarProvider>
    </AuthProvider>
    </PWAUpdateProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
