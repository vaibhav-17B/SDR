
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Onboard from "./pages/Onboard";
import UserInfo from "./pages/UserInfo";
import Prospects from "./pages/Prospects";
import Studio from "./pages/Studio";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { checkAuthStatus, logout } from "./utils/session";

const queryClient = new QueryClient();

// Main App Content Component (inside BrowserRouter)
const AppContent = () => {
  const location = useLocation();
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userEmail: null,
    sessionId: null
  });

  // Check auth status only when necessary
  const refreshAuthStatus = async (forceRefresh: boolean = false) => {
    try {
      const session = await checkAuthStatus(forceRefresh);
      if (session.isAuthenticated) {
        setAuthState({
          isAuthenticated: true,
          userEmail: session.userEmail || null,
          sessionId: session.sessionId || null
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          userEmail: null,
          sessionId: null
        });
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
    }
  };

  useEffect(() => {
    // Only check once on app load
    refreshAuthStatus();
  }, []);

  // Only refresh auth status on specific route changes that matter
  useEffect(() => {
    // Only refresh on routes where auth status might have changed
    if (location.pathname === '/user-info' || location.pathname === '/prospects' || location.pathname === '/studio') {
      // Use cached version unless coming from user-info (profile completion)
      const shouldForceRefresh = (location.pathname === '/prospects' || location.pathname === '/studio') && 
                                document.referrer.includes('/user-info');
      refreshAuthStatus(shouldForceRefresh);
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      // Clear local auth state immediately for better UX
      setAuthState({
        isAuthenticated: false,
        userEmail: null,
        sessionId: null
      });
      
      // Call the logout API
      await logout();
      
      // Trigger a page reload to reset all state
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
      // Still reload the page even if API call fails to clear local state
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <Navbar 
        userEmail={authState.userEmail}
        isAuthenticated={authState.isAuthenticated}
        onSignOut={handleSignOut}
      />
      <Routes>
        <Route path="/" element={<Onboard />} />
        <Route path="/user-info" element={<UserInfo onAuthChange={setAuthState} />} />
        <Route path="/prospects" element={<Prospects />} />
        <Route path="/studio" element={<Studio onAuthChange={setAuthState} />} />
        {/* Backward compatibility redirects */}
        <Route path="/find-leads" element={<Prospects />} />
        <Route path="/email-composer" element={<Studio onAuthChange={setAuthState} />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
