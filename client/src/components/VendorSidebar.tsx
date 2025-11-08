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
import { LayoutDashboard, Package, ShoppingCart, Store, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";

const menuItems = [
  {
    title: "Overview",
    url: "/vendor/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Products",
    url: "/vendor/products",
    icon: Package,
  },
  {
    title: "Orders",
    url: "/vendor/orders",
    icon: ShoppingCart,
  },
  {
    title: "Store Settings",
    url: "/vendor/store",
    icon: Settings,
  },
];

export function VendorSidebar() {
  const [location] = useLocation();

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
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-vendor-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
