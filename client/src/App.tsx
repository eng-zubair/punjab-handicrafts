import { Switch, Route, useLocation } from "wouter";
import { Component, useEffect, useRef } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WishlistProvider } from "@/components/WishlistContext";
import { CompareProvider } from "@/components/CompareContext";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import VendorRegister from "@/pages/VendorRegister";
import VendorOverview from "@/pages/vendor/Overview";
import VendorProducts from "@/pages/vendor/Products";
import VendorOrders from "@/pages/vendor/Orders";
import VendorStore from "@/pages/vendor/Store";
import VendorPromotions from "@/pages/vendor/Promotions";
import AdminOverview from "@/pages/admin/Overview";
import AdminModeration from "@/pages/admin/Moderation";
import AdminUsers from "@/pages/admin/Users";
import AdminOrders from "@/pages/admin/Orders";
import AdminAnalytics from "@/pages/admin/Analytics";
import AdminSettings from "@/pages/admin/Settings";
import AdminStores from "@/pages/admin/Stores";
import AdminCategories from "@/pages/admin/Categories";
import AdminArtisans from "@/pages/admin/Artisans";
import AdminTraining from "@/pages/admin/Training";
import AdminDistricts from "@/pages/admin/Districts";
import AdminCenters from "@/pages/admin/Centers";
import BuyerDashboard from "@/pages/buyer/Dashboard";
import NotFound from "@/pages/not-found";
import Brand from "@/pages/Brand";
import Pricing from "@/pages/vendor/Pricing";
import SellerGuide from "@/pages/vendor/SellerGuide";
import Verification from "@/pages/vendor/Verification";
import Store from "@/pages/Store";
import Stores from "@/pages/Stores";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Returns from "@/pages/Returns";
import Terms from "@/pages/Terms";
import Wishlist from "@/pages/Wishlist";
import Compare from "@/pages/Compare";
import TrainingHome from "@/pages/training/Home";
import TrainingPrograms from "@/pages/training/Programs";
import TrainingCenters from "@/pages/training/Centers";
import TrainingApply from "@/pages/training/Apply";
import TrainingDashboard from "@/pages/training/Dashboard";
import TrainingProgress from "@/pages/training/Progress";
import ArtisanRegister from "@/pages/artisan/Register";

function NavigationFocusHandler() {
  const [location] = useLocation();
  const lastClickRef = useRef<{ href: string | null; time: number } | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      let target = event.target as HTMLElement | null;
      while (target && target !== document.body) {
        if (target instanceof HTMLAnchorElement) {
          const href = target.getAttribute("href");
          if (!href) break;
          if (typeof window !== "undefined") {
            const origin = window.location.origin;
            const isAbsolute = /^https?:\/\//i.test(href);
            const isExternal = isAbsolute && !href.startsWith(origin);
            const isHash = href.startsWith("#");
            if (target.target === "_blank" || target.hasAttribute("download") || isExternal || isHash) {
              return;
            }
          }
          lastClickRef.current = { href, time: typeof performance !== "undefined" ? performance.now() : Date.now() };
          return;
        }
        target = target.parentElement;
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (focusTimeoutRef.current != null) {
      window.clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    const maxWait = 3000;
    const attemptFocus = () => {
      const main = document.querySelector("main");
      if (main instanceof HTMLElement) {
        const heading =
          main.querySelector("h1, h2, h3") ||
          document.querySelector("h1, h2, h3");
        const target = (heading as HTMLElement | null) || main;
        if (!target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
        }
        try {
          (target as HTMLElement).focus({ preventScroll: true } as any);
        } catch {
          (target as HTMLElement).focus();
        }
        return;
      }
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - startedAt < maxWait) {
        focusTimeoutRef.current = window.setTimeout(attemptFocus, 50);
      }
    };
    if (document.readyState === "loading") {
      const onReady = () => {
        attemptFocus();
        document.removeEventListener("DOMContentLoaded", onReady);
      };
      document.addEventListener("DOMContentLoaded", onReady);
    } else {
      focusTimeoutRef.current = window.setTimeout(attemptFocus, 0);
    }
    return () => {
      if (focusTimeoutRef.current != null) {
        window.clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, [location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/brands/:slug" component={Brand} />
      <Route path="/vendor/pricing" component={Pricing} />
      <Route path="/vendor/guide" component={SellerGuide} />
      <Route path="/vendor/verification" component={Verification} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/stores/:id" component={Store} />
      <Route path="/stores" component={Stores} />
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/compare" component={Compare} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/orders" component={Orders} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/returns" component={Returns} />
      <Route path="/terms" component={Terms} />
      <Route path="/buyer/dashboard" component={BuyerDashboard} />
      <Route path="/trainee/dashboard" component={TrainingDashboard} />
      <Route path="/vendor/register" component={VendorRegister} />
      <Route path="/vendor/dashboard" component={VendorOverview} />
      <Route path="/vendor/products" component={VendorProducts} />
      <Route path="/vendor/promotions" component={VendorPromotions} />
      <Route path="/vendor/orders" component={VendorOrders} />
      <Route path="/vendor/store" component={VendorStore} />
      {/* Training Module Routes */}
      <Route path="/training" component={TrainingHome} />
      <Route path="/training/programs" component={TrainingPrograms} />
      <Route path="/training/centers" component={TrainingCenters} />
      <Route path="/training/apply" component={TrainingApply} />
      <Route path="/training/progress/:id" component={TrainingProgress} />
      {/* Artisan Module Routes */}
      <Route path="/artisan/register" component={ArtisanRegister} />
      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminOverview} />
      <Route path="/admin/moderation" component={AdminModeration} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/stores" component={AdminStores} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/artisans" component={AdminArtisans} />
      <Route path="/admin/training" component={AdminTraining} />
      <Route path="/admin/districts" component={AdminDistricts} />
      <Route path="/admin/centers" component={AdminCenters} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; errorMessage?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: undefined };
  }
  static getDerivedStateFromError(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: msg };
  }
  componentDidCatch(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("App crashed:", msg);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
          <div className="w-full max-w-md mx-4 border rounded-lg bg-white">
            <div className="p-6">
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="mt-2 text-sm text-gray-600">{this.state.errorMessage || "An unexpected error occurred."}</p>
              <div className="mt-4 flex gap-2">
                <a href="/" className="px-4 py-2 rounded bg-black text-white">Go Home</a>
                <button onClick={() => location.reload()} className="px-4 py-2 rounded bg-gray-200">Reload</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CompareProvider>
          <WishlistProvider>
            <TooltipProvider>
              <Toaster />
              <ErrorBoundary>
                <NavigationFocusHandler />
                <Router />
              </ErrorBoundary>
            </TooltipProvider>
          </WishlistProvider>
        </CompareProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
