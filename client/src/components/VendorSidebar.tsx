import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Package, ShoppingCart, Store, Settings, LogOut, Tag } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

const menuItems = [
  {
    title: "Overview",
    url: "/vendor/dashboard",
    icon: LayoutDashboard,
    tip: "View your store overview and status",
  },
  {
    title: "Products",
    url: "/vendor/products",
    icon: Package,
    tip: "Manage products: add, edit, and deactivate",
  },
  {
    title: "Orders",
    url: "/vendor/orders",
    icon: ShoppingCart,
    tip: "Track and manage customer orders",
  },
  {
    title: "Promotions",
    url: "/vendor/promotions",
    icon: Tag,
    tip: "Create and manage discounts and offers",
  },
  {
    title: "Store Settings",
    url: "/vendor/store",
    icon: Settings,
    tip: "Update store information and preferences",
  },
];

export function VendorSidebar() {
  const [location, setLocation] = useLocation();
  const { logout, isLoggingOut } = useAuth();
  const { data: stores = [] } = useQuery<any[]>({ queryKey: ['/api/vendor/stores'] });
  const isDeactivated = (stores?.[0]?.status === 'deactivated');

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" data-testid="link-brand-logo">
              <Link href="/">
                <Store className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg">Sanatzar</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Vendor Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {isDeactivated && item.title !== 'Overview' ? (
                    <SidebarMenuButton aria-disabled className="opacity-50 cursor-not-allowed">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`} aria-label={item.title} data-tooltip={item.tip}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-testid="link-back-to-marketplace">
              <Link href="/">
                <Store className="w-4 h-4" />
                <span>Back to Marketplace</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() =>
                logout(undefined, {
                  onSuccess: () => setLocation("/"),
                })
              }
              disabled={isLoggingOut}
              data-testid="button-sidebar-logout"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
