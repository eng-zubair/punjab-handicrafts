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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
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
