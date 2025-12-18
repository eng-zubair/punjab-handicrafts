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
import { LayoutDashboard, ShieldCheck, Users, ShoppingCart, BarChart3, Store, Settings, LogOut, Tag, Palette, GraduationCap, Map, Building2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const menuItems = [
  {
    title: "Overview",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Moderation",
    url: "/admin/moderation",
    icon: ShieldCheck,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Stores",
    url: "/admin/stores",
    icon: Store,
  },
  {
    title: "Orders",
    url: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Categories",
    url: "/admin/categories",
    icon: Tag,
  },
  {
    title: "Districts",
    url: "/admin/districts",
    icon: Map,
  },
  {
    title: "Centers",
    url: "/admin/centers",
    icon: Building2,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
  {
    title: "Artisans",
    url: "/admin/artisans",
    icon: Palette,
  },
  {
    title: "Training",
    url: "/admin/training",
    icon: GraduationCap,
  },
];

export function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { logout, isLoggingOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" data-testid="link-admin-brand-logo">
              <Link href="/">
                <Store className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg">Sanatzar Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
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
              data-testid="button-admin-sidebar-logout"
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
