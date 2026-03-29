import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CheckoutProvider } from "@/contexts/CheckoutContext";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import CustomOrders from "./pages/CustomOrders";
import Contact from "./pages/Contact";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import BackToTop from "@/components/BackToTop";
import SplashScreen from "@/components/SplashScreen";
import Unsubscribed from "./pages/Unsubscribed";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import CheckoutAddress from "./pages/checkout/Address";
import CheckoutPayment from "./pages/checkout/Payment";
import CheckoutSuccess from "./pages/checkout/Success";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const App = () => {
  // Show splash only on first visit to the homepage, not on direct links to other pages
  const isHomepage = window.location.pathname === "/";
  const hasSeenSplash = sessionStorage.getItem("splashSeen") === "1";
  const [showSplash, setShowSplash] = useState(isHomepage && !hasSeenSplash);

  const handleSplashDone = () => {
    setShowSplash(false);
    sessionStorage.setItem("splashSeen", "1");
  };

  return (
    <>
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <CheckoutProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <ScrollToTop />
                    <BackToTop />
                    <Routes>
                      {/* Public */}
                      <Route path="/" element={<Index />} />
                      <Route path="/shop" element={<Shop />} />
                      <Route path="/product/:slug" element={<ProductDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/custom-orders" element={<CustomOrders />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/unsubscribed" element={<Unsubscribed />} />

                      {/* Authenticated users */}
                      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                      <Route path="/checkout/address" element={<ProtectedRoute><CheckoutAddress /></ProtectedRoute>} />
                      <Route path="/checkout/payment" element={<ProtectedRoute><CheckoutPayment /></ProtectedRoute>} />
                      <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />

                      {/* Admin only */}
                      <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
                      <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </CheckoutProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
