import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
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
import AdminOverview from "@/pages/admin/Overview";
import AdminModeration from "@/pages/admin/Moderation";
import AdminUsers from "@/pages/admin/Users";
import AdminOrders from "@/pages/admin/Orders";
import AdminAnalytics from "@/pages/admin/Analytics";
import AdminSettings from "@/pages/admin/Settings";
import AdminStores from "@/pages/admin/Stores";
import AdminCategories from "@/pages/admin/Categories";
import BuyerDashboard from "@/pages/buyer/Dashboard";
import NotFound from "@/pages/not-found";
import Brand from "@/pages/Brand";
import Pricing from "@/pages/vendor/Pricing";
import SellerGuide from "@/pages/vendor/SellerGuide";
import Verification from "@/pages/vendor/Verification";
import Store from "@/pages/Store";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Returns from "@/pages/Returns";
import Terms from "@/pages/Terms";

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
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/orders" component={Orders} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/returns" component={Returns} />
      <Route path="/terms" component={Terms} />
      <Route path="/buyer/dashboard" component={BuyerDashboard} />
      <Route path="/vendor/register" component={VendorRegister} />
      <Route path="/vendor/dashboard" component={VendorOverview} />
      <Route path="/vendor/products" component={VendorProducts} />
      <Route path="/vendor/orders" component={VendorOrders} />
      <Route path="/vendor/store" component={VendorStore} />
      <Route path="/admin/dashboard" component={AdminOverview} />
      <Route path="/admin/moderation" component={AdminModeration} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/stores" component={AdminStores} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
