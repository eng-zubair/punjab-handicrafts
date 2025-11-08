import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, User, Menu, Moon, Sun, Store, LayoutDashboard, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { getCartCount } from "@/lib/cart";
import { useAuth } from "@/hooks/use-auth";

const giBrands = [
  "All GI Brands",
  "Lahore Heritage Crafts",
  "Multani Crafts",
  "Cholistani Heritage",
  "Faisalabadi Weaves",
  "Punjab Metal & Leather Works",
  "Pothohari Crafts",
  "Sufi Craft Collection",
  "Salt & Stone Crafts",
  "Saraiki Tribal Arts"
];

export default function Header() {
  const { user, isAuthenticated, isVendor, login, logout } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGIBrand, setSelectedGIBrand] = useState("all");
  const [isDark, setIsDark] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    setCartCount(getCartCount());
    
    const handleCartUpdate = () => {
      setCartCount(getCartCount());
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery)}`);
    } else {
      setLocation('/products');
    }
  };

  const handleGIBrandChange = (giBrand: string) => {
    setSelectedGIBrand(giBrand);
    if (giBrand === "all") {
      setLocation('/products');
    } else {
      setLocation(`/products?giBrand=${encodeURIComponent(giBrand)}`);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-menu" aria-label="Open navigation menu">
              <Menu className="w-5 h-5" />
            </Button>
            <Link href="/">
              <h1 className="text-xl sm:text-2xl font-bold text-primary cursor-pointer hover-elevate rounded-md px-2 py-1" data-testid="text-logo">
                Sanatzar
              </h1>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-1 max-w-2xl">
            <Select value={selectedGIBrand} onValueChange={handleGIBrandChange}>
              <SelectTrigger className="w-56" data-testid="select-gi-brand">
                <SelectValue placeholder="All GI Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All GI Brands</SelectItem>
                {giBrands.slice(1).map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 flex items-center relative">
              <Input
                type="search"
                placeholder="Search handicrafts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 pr-10"
                data-testid="input-search"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-0 top-1/2 -translate-y-1/2 mt-[35px]"
                onClick={handleSearch}
                data-testid="button-search"
                aria-label="Search products"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative" data-testid="button-cart" aria-label="Shopping cart">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    data-testid="badge-cart-count"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-user-menu" aria-label="User menu" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                      <AvatarFallback>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium" data-testid="text-user-name">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-user-email">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isVendor && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/vendor/dashboard">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          <span data-testid="link-vendor-dashboard">Vendor Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={logout} data-testid="button-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" onClick={login} data-testid="button-login">
                Login
              </Button>
            )}
          </div>
        </div>

        <div className="md:hidden pb-3 space-y-2">
          <div className="flex items-center relative">
            <Input
              type="search"
              placeholder="Search handicrafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 pr-10"
              data-testid="input-search-mobile"
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-0 top-1/2 -translate-y-1/2 mt-[35px]"
              onClick={handleSearch}
              data-testid="button-search-mobile"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <Select value={selectedGIBrand} onValueChange={handleGIBrandChange}>
            <SelectTrigger className="w-full" data-testid="select-gi-brand-mobile">
              <SelectValue placeholder="All GI Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All GI Brands</SelectItem>
              {giBrands.slice(1).map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
